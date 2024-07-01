import { Hono } from "hono";
import { verify } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use(async (c, next) => {
  if (c.req.method === "POST" || c.req.method === "PUT") {
    const jwt = c.req.header("Authorization");
    if (!jwt) {
      c.status(401);
      return c.json({ error: "unauthorized" });
    }
    const token = jwt.split(" ")[1];
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload || typeof payload.id !== "string") {
      c.status(401);
      return c.json({ error: "unauthorized" });
    }
    c.set("userId", payload.id);
  }
  await next();
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });
    return c.json({
      id: post.id,
      message: "Succesfully created the blog",
      post,
    });
  } catch (error) {
    c.status(411);
    return c.json({ error: "Error while post the blog" });
  }
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  const userId = c.get("userId");
  try {
    const body = await c.req.json();
    console.log(body)
    await prisma.post.update({
      where: {
        id: body.id,
        authorId: userId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.text("updated post");
  } catch (error) {
    c.status(411);
    return c.json({ error: "Error while updating the blog" });
  }
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const posts = await prisma.post.findMany();
    return c.json(posts);
  } catch (error) {
    c.status(411);
    return c.json({ error: "Error while fetching the blog" });
  }
});

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const post = await prisma.post.findUnique({
      where: {
        id,
      },
    });

    return c.json({
      post,
    });
  } catch (error) {
    c.status(411);
    return c.json({ error: "Error while fetching the blog" });
  }
});
