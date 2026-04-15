import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PendingRegistrationDocument = HydratedDocument<PendingRegistration>;

@Schema({ collection: 'pending_registrations', timestamps: true })
export class PendingRegistration {
    @Prop({ required: true })
    userName!: string;

    @Prop({ required: true })
    userLastname!: string;

    @Prop({ required: true })
    userBirthday!: string;

    @Prop({ required: true, unique: true })
    userEmail!: string;

    @Prop({ required: true })
    hashedPassword!: string;

    @Prop({ required: true })
    code!: string;

    @Prop({ required: true })
    expiresAt!: Date;
}

export const PendingRegistrationSchema = SchemaFactory.createForClass(PendingRegistration);