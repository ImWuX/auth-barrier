import express, { Request, Response, NextFunction } from "express";
import zod from "zod";
import { prisma } from "../index.js";

const router = express.Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.send(await prisma.site.findMany({ include: { users: { select: { id: true, username: true } } } }));
    } catch(err) {
        next(err);
    }
});

const zodSite = zod.object({
    name: zod.string().regex(/^[a-zA-Z0-9_]+$/, "Site name should only contain alphanumerical characters and underscores")
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = zodSite.parse(req.body);
        if(await prisma.site.findFirst({ where: { name: name } })) return res.status(409).send({ error: "A site by that name already exist" });
        await prisma.site.create({ data: { name: name } });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

router.delete("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = zodSite.parse(req.body);
        if(!await prisma.site.findFirst({ where: { name: name } })) return res.status(409).send({ error: "A site by that name does not exist" });
        await prisma.site.delete({ where: { name: name } });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

const zodSiteUser = zod.object({
    siteName: zod.string().nonempty(),
    userId: zod.number()
});

router.post("/user", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { siteName, userId } = zodSiteUser.parse(req.body);
        await prisma.site.update({ where: { name: siteName}, data: { users: { connect: { id: userId } } } });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

router.delete("/user", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { siteName, userId } = zodSiteUser.parse(req.body);
        await prisma.site.update({ where: { name: siteName}, data: { users: { disconnect: { id: userId } } } });
        res.sendStatus(200);
    } catch(err) {
        next(err);
    }
});

export default router;