import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { GmailSmtpProvider } from './gmail-smtp.provider';
import { GmailSmtpTransportFactory } from './gmail-smtp-transport.factory';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [GmailSmtpTransportFactory, GmailSmtpProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
