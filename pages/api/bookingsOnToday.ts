const { connectToDatabase } = require("../../lib/mongodb")
const ObjectId = require("mongodb").ObjectId
import type { NextApiRequest, NextApiResponse } from "next"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
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
    case "GET": {
      return getBookingsOnToday(req, res)
    }
    case "OPTIONS": {
      return res.status(200).send({ message: "ok" })
    }
  }

  async function getBookingsOnToday(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      let { db } = await connectToDatabase()
      let startOfDay =
        req.query && req.query.startOfDay ? req.query.startOfDay : ""
      let endOfDay = req.query && req.query.endOfDay ? req.query.endOfDay : ""
      let start = new Date()
      let end = new Date()
      // console.log("")
      // console.log(start)
      // console.log(end)
      console.log("startOfDay: " + startOfDay)
      console.log("endOfDay: " + endOfDay)
      console.log(dayjs().startOf("day").format("hh-mm-ss"))
      console.log(dayjs().endOf("day").format("hh-mm-ss"))

      // start.setHours(0, 0, 0, 0)
      // end.setHours(23, 59, 59, 999)
      console.log(start)
      console.log(end)
      console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)

      let bookings = await db
        .collection(collectionName)
        .find({
          checkinDate: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        })
        .toArray()

      return res.json({
        message: JSON.parse(JSON.stringify(bookings)),
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
