import express, { Request, Response, NextFunction } from "express";
import { authenticator } from "otplib";
import zod from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { redis, prisma } from "../index.js";

const unprotectedRouter = express.Router();

const zodAuth = zod.object({
    username: zod.string().min(3).max(16),
    password: zod.string().min(3).max(128),
    code: zod.string().optional()
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
        const { code, username, password } = zodAuth.parse(req.body);

        const user = await prisma.user.findFirst({ where: { username: username }, include: { totp: true, backupCodes: true } });
        if(user == null) return res.status(404).send({ error: { username: "User does not exist" } });

        const isPasswordValid: boolean = await new Promise((resolve) => {
            bcrypt.compare(password, user.password, async (err, isMatch) => {
                if(err) throw err;
                return resolve(isMatch);
            });
        });

        if(!isPasswordValid) return res.status(401).send({ error: { password: "Wrong password" }});

        if(user.totp && user.totp.enabled) {
            if(!code) return res.send({ totp: true });
            if(!authenticator.check(code, user.totp.secret)) {
                if(user.backupCodes.filter((c: any) => c.code == code).length <= 0) return res.status(401).send({ error: { totp: "Invalid two factor code" } });
                await prisma.totpBackupCodes.deleteMany({ where: { code: { equals: code }, userId: { equals: user.id } } });
            }
        }

        const session = await createSession(user.id);
        res.cookie(process.env.COOKIE_NAME, session.secret, {
            domain: `.${process.env.ROOT_DOMAIN}`,
            path: "/",
            maxAge: Number(process.env.SESSION_LENGTH) * 1000
        }).send({ totp: false });
    } catch(err) {
        next(err);
    }
});

unprotectedRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, password } = zodAuth.parse(req.body);

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
                admin: false
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
    const user = await prisma.user.findFirst({ where: { id: req.userId }, include: { totp: true } });
    if(!user) return res.status(404).send({ error: "Non-existant session user" });
    try {
        res.send({
            user: {
                id: user.id,
                username: user.username,
                totp: user.totp && user.totp.enabled,
                isAdmin: user.admin
            }
        });
    } catch(err) {
        next(err);
    }
});

const zodPasswordReset = zod.object({
    password: zod.string().min(3).max(128),
    code: zod.string().optional()
});

protectedRouter.post("/passwordreset", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { password, code } = zodPasswordReset.parse(req.body);
        const user = await prisma.user.findFirst({ where: { id: req.userId }, include: { totp: true, backupCodes: true } });
        if(!user) return res.status(404).send({ error: "Non-existant session user" });

        if(user.totp && user.totp.enabled) {
            if(!code) return res.status(401).send({ error: "Invalid two factor code" });
            if(!authenticator.check(code, user.totp.secret)) {
                if(user.backupCodes.filter((c: any) => c.code == code).length <= 0) return res.status(401).send({ error: { totp: "Invalid two factor code" } });
                await prisma.totpBackupCodes.deleteMany({ where: { code: { equals: code }, userId: { equals: user.id } } });
            }
        }

        await prisma.user.update({
            data: {
                password: await new Promise((resolve) => {
                    bcrypt.genSalt(10, (err, salt) => {
                        if(err) throw err;
                        bcrypt.hash(password, salt, (err, hash) => {
                            if(err) throw err;
                            resolve(hash);
                        });
                    });
                }),
            },
            where: { id: req.userId }
        });

        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

export {
    unprotectedRouter,
    protectedRouter
};