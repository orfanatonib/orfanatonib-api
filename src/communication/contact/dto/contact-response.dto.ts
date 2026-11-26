import type { ContactEntity } from "../contact.entity";

/** Recibo devolvido a quem envia o formulário público: só o necessário, nada interno (`read`). */
export class ContactReceiptDto {
  id!: string;
  createdAt!: Date;

  static fromEntity(entity: ContactEntity): ContactReceiptDto {
    return { id: entity.id, createdAt: entity.createdAt };
  }
}

/** Visão da caixa de mensagens do admin. */
export class ContactResponseDto {
  id!: string;
  name!: string;
  email!: string;
  phone!: string;
  message!: string;
  read!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: ContactEntity): ContactResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      message: entity.message,
      read: entity.read,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
