/* eslint-disable @typescript-eslint/require-await -- dublês assíncronos de teste */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Request } from "express";

import { EventAudience } from "../entities/event.entity";
import { GetEventService } from "./get-event.service";

const event = (id: string, audience: EventAudience) =>
  ({
    id,
    title: id,
    date: "2026-12-01",
    location: "L",
    description: "d",
    audience,
  }) as never;

function setup(role?: string) {
  const repo = {
    findAll: jest.fn(async (allowed: string[]) =>
      [
        event("a", EventAudience.ALL),
        event("m", EventAudience.MEMBERS),
        event("l", EventAudience.LEADERS),
      ].filter((e) =>
        allowed.includes((e as unknown as { audience: string }).audience),
      ),
    ),
    findById: jest.fn(
      async (id: string) =>
        (
          ({
            all: event("a", EventAudience.ALL),
            mem: event("m", EventAudience.MEMBERS),
            lead: event("l", EventAudience.LEADERS),
          }) as Record<string, unknown>
        )[id] ?? null,
    ),
  };
  const media = {
    findManyMediaItemsByTargets: jest.fn(async () => []),
    findMediaItemByTarget: jest.fn(async () => null),
  };
  const auth = {
    tryGetPayload: jest.fn(async () => (role ? { role, sub: "u" } : null)),
  };
  return {
    repo,
    svc: new GetEventService(repo as never, media as never, auth as never),
  };
}
const req = {} as Request;
const ids = (list: Array<{ id: string }>) => list.map((e) => e.id);

describe("GetEventService: visibilidade por público", () => {
  it.each([
    [undefined, ["a"]],
    ["member", ["a", "m"]],
    ["leader", ["a", "m", "l"]],
    ["admin", ["a", "m", "l"]],
  ])("findAll para %s", async (role, expected) => {
    const { svc } = setup(role);
    expect(ids(await svc.findAll(req))).toEqual(expected);
  });

  it("findOne de evento de outro público é 404 (não revela existência)", async () => {
    const anon = setup();
    await expect(anon.svc.findOne("mem", req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(anon.svc.findOne("lead", req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect((await anon.svc.findOne("all", req)).id).toBe("a");

    const member = setup("member");
    expect((await member.svc.findOne("mem", req)).id).toBe("m");
    await expect(member.svc.findOne("lead", req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("id inválido é 400 e inexistente é 404", async () => {
    const { svc } = setup("admin");
    await expect(svc.findOne("", req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.findOne("zzz", req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
