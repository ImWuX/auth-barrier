import express, { Request, Response, NextFunction } from "express";
import zod from "zod";
import { prisma } from "../index.js";

const router = express.Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.send(await prisma.user.findMany({ select: { id: true, username: true, admin: true } }));
    } catch(err) {
        next(err);
    }
});

const zodUser = zod.object({
    id: zod.number()
});

router.delete("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = zodUser.parse(req.body);
        if(!await prisma.user.findFirst({ where: { id: id } })) return res.status(409).send({ error: "No such user" });
        await prisma.user.delete({ where: { id: id } });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

export default router;