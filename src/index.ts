import "dotenv/config";
import http from "http";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import zod, { ZodError } from "zod";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { createClient as createRedisClient } from "redis";

declare global {
    namespace Express {
        interface Request {
            sessionSecret: string | undefined;
        }
    }

    namespace NodeJS {
        interface ProcessEnv {
            PORT: string;
            REDIS_URL: string;
            SESSION_LENGTH: string;
        }
    }
}

const DEFAULT_PERMISSIONS = 0;

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

const redisClient = createRedisClient({
    url: process.env.REDIS_URL
});

redisClient.connect();

app.use(cookieParser());
app.use(express.json());

app.use(async (req: Request, res: Response, next: NextFunction) => {
    if(!req.cookies.authbarrier_session_secret) return next();
    try {
        if(!await redisClient.exists(req.cookies.authbarrier_session_secret)) return next();
        req.sessionSecret = req.cookies.authbarrier_session_secret;
    } catch(err) {
        console.error(err);
    }
    next();
});

app.get("/nginxauth", async (req: Request, res: Response) => {
    if(!req.sessionSecret) return res.sendStatus(401);
    if(!req.subdomains || req.subdomains.length <= 0) return res.sendStatus(400);
    res.sendStatus(200);
});

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
    } while(await redisClient.exists(secret));
    await redisClient.hSet(secret, "user", userId);
    await redisClient.expire(secret, Number(process.env.SESSION_LENGTH));
    return {
        secret
    };
}

app.post("/api/login", async (req: Request, res: Response, next: NextFunction) => {
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

        res.send({
            session: await createSession(user.id)
        });
    } catch(err) {
        next(err);
    }
});

app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
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

        res.send({
            session: await createSession(user.id)
        });
    } catch(err) {
        next(err);
    }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if(err instanceof ZodError) {
        res.status(400).send({ error: err.flatten().fieldErrors });
    } else {
        console.error(err);
        res.status(500).send({ error: "Internal server error" });
    }
});

// React app
app.use(express.static(path.join(__dirname, "web")));
app.get("*", async (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "web", "index.html"));
});

server.listen(Number(process.env.PORT));

export {
    prisma
}