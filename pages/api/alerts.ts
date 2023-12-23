const { connectToDatabase } = require("../../lib/mongodb")
const ObjectId = require("mongodb").ObjectId
import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = {
  message: string
}

const collectionName = "alerts"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  switch (req.method) {
    case "GET": {
      return getAlerts(req, res)
    }
    case "OPTIONS": {
      return res.status(200).send({ message: "ok" })
    }
  }

  async function getAlerts(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let alerts

      if (req.query.id) {
        alerts = await db.collection(collectionName).findOne({
          _id: parseInt(req.query.id as any),
        })
      } else {
        alerts = await db.collection(collectionName).find().toArray()
      }

      return res.json({
        message: JSON.parse(JSON.stringify(alerts)),
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
