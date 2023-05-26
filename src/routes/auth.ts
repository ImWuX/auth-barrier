import express, { Request, Response, NextFunction } from "express";
import zod from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redis, prisma } from "../index.js";

const DEFAULT_PERMISSIONS = 0;

const unprotectedRouter = express.Router();

const zodUser = zod.object({
    username: zod.string().min(3).max(16),
    password: zod.string().min(3).max(128)
});

const createSession = async (userId: number): Promise<{
    secret: string
}> => {
    let secret;
    do {
        secret = crypto.randomBytes(32).toString("hex");
    } while(await redis.exists(secret));
    await redis.hSet(`session:${secret}`, "user", userId);
    await redis.expire(`session:${secret}`, Number(process.env.SESSION_LENGTH));
    return {
        secret
    };
}

unprotectedRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, password } = zodUser.parse(req.body);

        const user = await prisma.user.findFirst({ where: { username: username } });
        if(user == null) return res.status(404).send({ error: { username: "User does not exist" } });

        const isPasswordValid: boolean = await new Promise((resolve) => {
            bcrypt.compare(password, user.password, async (err, isMatch) => {
                if(err) throw err;
                return resolve(isMatch);
            });
        });

        if(!isPasswordValid) return res.status(401).send({ error: { password: "Wrong password" }});

        const session = await createSession(user.id);
        res.cookie(process.env.COOKIE_NAME, session.secret, {
            domain: `.${process.env.ROOT_DOMAIN}`,
            path: "/",
            maxAge: Number(process.env.SESSION_LENGTH) * 1000
        }).send();
    } catch(err) {
        next(err);
    }
});

unprotectedRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, password } = zodUser.parse(req.body);

        let user = await prisma.user.findFirst({ where: { username: username } });
        if(user != null) return res.status(409).send({ error: { username: "Username is taken" } });

        user = await prisma.user.create({
            data: {
                username: username,
                password: await new Promise((resolve) => {
                    bcrypt.genSalt(10, (err, salt) => {
                        if(err) throw err;
                        bcrypt.hash(password, salt, (err, hash) => {
                            if(err) throw err;
                            resolve(hash);
                        });
                    });
                }),
                permissions: DEFAULT_PERMISSIONS
            }
        });

        const session = await createSession(user.id);
        res.cookie(process.env.COOKIE_NAME, session.secret, {
            domain: `.${process.env.ROOT_DOMAIN}`,
            path: "/",
            maxAge: Number(process.env.SESSION_LENGTH) * 1000
        }).send();
    } catch(err) {
        next(err);
    }
});

const protectedRouter = express.Router();

protectedRouter.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
    try {
        await redis.del(`session:${req.sessionSecret}`);
        res.clearCookie(process.env.COOKIE_NAME, { domain: `.${process.env.ROOT_DOMAIN}` }).send();
    } catch(err) {
        next(err);
    }
});

protectedRouter.get("/session", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = Number(await redis.hGet(`session:${req.sessionSecret}`, "user"));
        if(!userId) return res.status(400).send({ error: "Invalid session user" });
        const user = await prisma.user.findFirst({ where: { id: userId } });
        if(!user) return res.status(404).send({ error: "Non-existant session user" });
        res.send({
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch(err) {
        next(err);
    }
});

export {
    unprotectedRouter,
    protectedRouter
};