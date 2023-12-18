const { connectToDatabase } = require("../../lib/mongodb")
const ObjectId = require("mongodb").ObjectId
import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = {
  message: string
}

const collectionName = "tasks"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  switch (req.method) {
    case "GET": {
      return getTasks(req, res)
    }
    case "POST": {
      return addTask(req, res)
    }
    case "PUT": {
      return updateTask(req, res)
    }
    case "DELETE": {
      return deleteTask(req, res)
    }
    case "OPTIONS": {
      return res.status(200).send({ message: "ok" })
    }
  }

  async function getTasks(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let tasks = await db.collection(collectionName).find().toArray()

      return res.json({
        message: JSON.parse(JSON.stringify(tasks)),
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }

  async function addTask(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let data = JSON.parse(req.body)

      await db.collection(collectionName).insertOne(data)

      return res.json({
        message: "task added successfully",
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }

  async function updateTask(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let bodyJson = JSON.parse(req.body)
      let newData = structuredClone(bodyJson)

      // update task
      let dbResult = await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(req.query.id),
        },
        {
          $set: newData,
        }
      )

      return res.json({
        message: "Task updated successfully",
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }

  async function deleteTask(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()

      await db.collection(collectionName).deleteOne({
        _id: new ObjectId(req.query.id),
      })

      return res.json({
        message: "Task deleted successfully",
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
