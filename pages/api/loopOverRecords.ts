const { connectToDatabase } = require("../../lib/mongodb")
const ObjectId = require("mongodb").ObjectId
import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = {
  message: string
}

const collectionName = "guests"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  switch (req.method) {
    case "GET": {
      return updateRecords(req, res)
    }
  }

  async function pushField(db: any, guest: any) {
    return await db.collection("guests").updateOne(
      {
        _id: new ObjectId(guest._id),
      },
      {
        $set: {
          history: [
            {
              id: new ObjectId(),
              category: "guest",
              action: "Guest Created",
              data: guest,
              by: "Hotel Manager",
              date: guest.signUpDate ? new Date(guest.signUpDate) : new Date(),
            },
          ],
        },
      }
    )
  }

  async function updateRecords(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let guests = await db.collection(collectionName).find().toArray()

      guests.forEach((guest: any) => {
        pushField(db, guest)
      })

      return res.json({
        message: JSON.parse(JSON.stringify(guests)),
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }
}
