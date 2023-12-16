const { connectToDatabase } = require("../../lib/mongodb")
const dayjs = require("dayjs")
const utc = require("dayjs/plugin/utc")
const util = require("./util/util")
const ObjectId = require("mongodb").ObjectId
import type { NextApiRequest, NextApiResponse } from "next"
dayjs.extend(utc)

type ResponseData = {
  message: string
}

const collectionName = "bookings"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  switch (req.method) {
    case "PUT": {
      return toggleCheckIn(req, res)
    }
    case "OPTIONS": {
      return res.status(200).send({ message: "ok" })
    }
  }

  async function toggleCheckIn(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let bodyJson = JSON.parse(req.body)

      let addDatesToNewRoom = await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(bodyJson.id),
        },
        {
          $set: { checkedIn: bodyJson.checkedIn },
        }
      )

      console.log(addDatesToNewRoom)
      return res.json({
        message: "Guest checked in",
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
