import "dotenv/config";
import http from "http";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";
import { createClient as createRedisClient } from "redis";
import { unprotectedRouter as authUnprotectedRoutes, protectedRouter as authProtectedRoutes } from "./routes/auth.js";
import totpRoutes from "./routes/totp.js";

declare global {
    namespace Express {
        interface Request {
            sessionSecret: string | undefined;
            userId: number;
        }
    }

    namespace NodeJS {
        interface ProcessEnv {
            PORT: string;
            REDIS_URL: string;
            SESSION_LENGTH: string;
            ROOT_DOMAIN: string;
            COOKIE_NAME: string;
        }
    }
}

const prisma = new PrismaClient();
const redis = createRedisClient({ url: process.env.REDIS_URL });
redis.connect();

const app = express();
const server = http.createServer(app);

app.use(cookieParser());
app.use(express.json());

app.use(async (req: Request, res: Response, next: NextFunction) => {
    if(!req.cookies[process.env.COOKIE_NAME]) return next();
    try {
        if(!await redis.exists(`session:${req.cookies[process.env.COOKIE_NAME]}`)) return next();
        req.sessionSecret = req.cookies[process.env.COOKIE_NAME];
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

app.use("/api/auth", authUnprotectedRoutes);

const protectedRouter = express.Router();

protectedRouter.use(async (req: Request, res: Response, next: NextFunction) => {
    if(!req.sessionSecret) return res.status(401).send({ error: "No active session" });
    const userId = Number(await redis.hGet(`session:${req.sessionSecret}`, "user"));
    if(!userId) return res.status(400).send({ error: "Invalid session user" });
    req.userId = userId;
    next();
});

protectedRouter.use("/api/auth", authProtectedRoutes);
protectedRouter.use("/api/totp", totpRoutes);

app.use(protectedRouter);

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
    prisma,
    redis
}