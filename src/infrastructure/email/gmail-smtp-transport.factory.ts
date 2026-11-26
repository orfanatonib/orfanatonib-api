import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { GmailSmtpTransportOptions, SmtpTransport } from "./email.types";

@Injectable()
export class GmailSmtpTransportFactory {
  create(options: GmailSmtpTransportOptions): SmtpTransport {
    return nodemailer.createTransport(options);
  }
}
