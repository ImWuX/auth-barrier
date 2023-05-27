import express, { Request, Response, NextFunction } from "express";
import { authenticator } from "otplib";
import zod from "zod";
import crypto from "crypto";
import { prisma } from "../index.js";

const router = express.Router();

const generateCodes = async (userId: number) => {
    await prisma.totpBackupCodes.deleteMany({ where: { userId: { equals: userId } } });
    let codes = [];
    for(let i = 0; i < 6; i++) {
        const code = crypto.randomBytes(16).toString("hex");
        await prisma.totpBackupCodes.create({
            data: {
                code: code,
                userId: userId
            }
        });
        codes.push(code);
    }
    return codes;
}

router.get("/setup", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findFirst({ where: { id: { equals: req.userId } }, include: { totp: true } });
        if(!user) return res.status(404).send({ error: "Non-existant session user" });
        if(user.totp && user.totp.enabled) return res.status(409).send({ error: "Two factor authentication is already enabled" });

        const secret = authenticator.generateSecret();
        const codes = await generateCodes(req.userId);
        const url = authenticator.keyuri(user.username, process.env.APP_NAME, secret);

        await prisma.totp.upsert({
            where: { userId: req.userId },
            create: {
                userId: req.userId,
                secret: secret,
                enabled: false
            },
            update: {
                secret: secret,
                enabled: false
            }
        });

        return res.send({ backupCodes: codes, url });
    } catch(err) {
        next(err);
    }
});

const zodCode = zod.object({
    code: zod.string()
});

router.post("/enable", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = zodCode.parse(req.body);
        const totp = await prisma.totp.findFirst({ where: { userId: { equals: req.userId } } });
        if(!totp || totp.enabled) return res.status(404).send({ error: "Two factor authentication setup not started" });

        if(!authenticator.check(code, totp.secret)) return res.status(401).send({ error: "Invalid code" });
        await prisma.totp.update({
            data: { enabled: true },
            where: { userId: req.userId }
        });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

router.post("/disable", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = zodCode.parse(req.body);
        const totp = await prisma.totp.findFirst({ where: { userId: { equals: req.userId } } });
        if(!totp || !totp.enabled) return res.status(404).send({ error: "Two factor authentication is not enabled" });

        if(!authenticator.check(code, totp.secret)) return res.status(401).send({ error: "Invalid code" });
        await prisma.totp.delete({ where: { userId: req.userId } });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

export default router;