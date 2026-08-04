import { Schema, model, Document, Types } from "mongoose";

export interface IClan extends Document {
  _id: Types.ObjectId;
  name: string;
  tag: string;
  logoUrl?: string;
  ownerId: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const clanSchema = new Schema<IClan>(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    tag: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 5 },
    logoUrl: { type: String, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
  },
  { timestamps: true }
);

// "Which clan is this user in?" is the hottest lookup (join guards, /clans/me).
clanSchema.index({ members: 1 });

export const Clan = model<IClan>("Clan", clanSchema);
