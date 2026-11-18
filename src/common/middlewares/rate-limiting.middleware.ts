import { Injectable, NestMiddleware, HttpStatus } from "@nestjs/common";
import { Request, Response, NextFunction, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { TooManyRequestsException } from "../exceptions/too-many-requests.exception";

declare module "express" {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: Date;
    };
  }
}

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private readonly limiters: Map<string, RequestHandler> = new Map();

  constructor() {
    this.setupLimiters();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const limiter = this.getLimiterForRoute(req);
    limiter(req, res, next);
  }

  private setupLimiters(): void {
    this.limiters.set(
      "general",
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        message: {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests from this IP, please try again later.",
          error: "Too Many Requests",
          category: "RULE",
          retryAfter: "900",
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request) => {
          const retryAfter = Math.ceil(
            (req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000,
          );
          throw new TooManyRequestsException(
            "Too many requests from this IP, please try again later.",
            retryAfter,
          );
        },
        skip: (req: Request) => {
          return req.url === "/health" || req.url === "/health-check";
        },
      }),
    );

    this.limiters.set(
      "auth",
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many authentication attempts, please try again later.",
          error: "Too Many Requests",
          category: "SECURITY",
          retryAfter: "900",
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request) => {
          const retryAfter = Math.ceil(
            (req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000,
          );
          throw new TooManyRequestsException(
            "Too many authentication attempts, please try again later.",
            retryAfter,
          );
        },
      }),
    );

    this.limiters.set(
      "write",
      rateLimit({
        windowMs: 5 * 60 * 1000,
        max: 50,
        message: {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many write operations, please slow down.",
          error: "Too Many Requests",
          category: "RULE",
          retryAfter: "300",
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request) => {
          const retryAfter = Math.ceil(
            (req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000,
          );
          throw new TooManyRequestsException(
            "Too many write operations, please slow down.",
            retryAfter,
          );
        },
      }),
    );

    this.limiters.set(
      "upload",
      rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many file uploads, please try again later.",
          error: "Too Many Requests",
          category: "RULE",
          retryAfter: "3600",
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: Request) => {
          const retryAfter = Math.ceil(
            (req.rateLimit?.resetTime?.getTime() || Date.now()) / 1000,
          );
          throw new TooManyRequestsException(
            "Too many file uploads, please try again later.",
            retryAfter,
          );
        },
      }),
    );
  }

  private limiter(name: string): RequestHandler {
    const limiter = this.limiters.get(name);
    if (!limiter) throw new Error(`Limitador não configurado: ${name}`);
    return limiter;
  }

  private getLimiterForRoute(req: Request): RequestHandler {
    const url = req.url.toLowerCase();
    const method = req.method.toUpperCase();

    if (url.includes("/auth/") && (method === "POST" || method === "PUT")) {
      return this.limiter("auth");
    }
    if (
      url.includes("/upload") ||
      req.headers["content-type"]?.includes("multipart/form-data")
    ) {
      return this.limiter("upload");
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return this.limiter("write");
    }
    return this.limiter("general");
  }
}
