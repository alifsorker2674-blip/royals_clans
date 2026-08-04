import { Schema, model, Document, Types } from "mongoose";

export type MatchStatus = "pending" | "auto_confirmed" | "under_review" | "admin_resolved";

export interface IMatchSubmission {
  userId: Types.ObjectId;
  screenshotUrl: string;
  selectedWinner: Types.ObjectId;
  submittedAt: Date;
}

export interface IMatch extends Document {
  _id: Types.ObjectId;
  tournamentId: Types.ObjectId;
  round: string;
  status: MatchStatus;
  submissions: IMatchSubmission[];
  finalWinner?: Types.ObjectId;
  verifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<IMatchSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    screenshotUrl: { type: String, required: true, trim: true },
    selectedWinner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const matchSchema = new Schema<IMatch>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    round: { type: String, trim: true, default: "Final" },
    status: {
      type: String,
      enum: ["pending", "auto_confirmed", "under_review", "admin_resolved"],
      default: "pending",
      index: true,
    },
    submissions: { type: [submissionSchema], default: [] },
    finalWinner: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Match = model<IMatch>("Match", matchSchema);
