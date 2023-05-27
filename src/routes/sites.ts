import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../index.js";

const router = express.Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.send(await prisma.site.findMany());
    } catch(err) {
        next(err);
    }
});

export default router;