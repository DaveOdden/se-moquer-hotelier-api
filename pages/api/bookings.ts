const { connectToDatabase } = require("../../lib/mongodb")
const dayjs = require("dayjs")
const utc = require("dayjs/plugin/utc")
const util = require("./util/util")
const ObjectId = require("mongodb").ObjectId
import type { NextApiRequest, NextApiResponse } from "next"
import { headers } from "next/headers"
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
      return getBookings(req, res)
    }
    case "POST": {
      return addBooking(req, res)
    }
    case "PUT": {
      return updateBooking(req, res)
    }
    case "DELETE": {
      return deleteBooking(req, res)
    }
    case "OPTIONS": {
      return res.status(200).send({ message: "ok" })
    }
  }

  async function getBookings(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let rooms = await db.collection(collectionName).find().toArray()

      let arrayOfRoomsBooked: Array<any> = []
      rooms.forEach((record: any) => {
        if (record.room._id) {
          arrayOfRoomsBooked.push(record.room._id)
        }
      })

      return res.json({
        message: JSON.parse(JSON.stringify(rooms)),
        arrayOfRoomsBooked: arrayOfRoomsBooked,
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }

  async function addBooking(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let data = JSON.parse(req.body)
      let clonedData = structuredClone(data)
      let guestId = clonedData.guest
      let roomId = clonedData.room
      clonedData.guest = {
        _id: new ObjectId(guestId),
      }
      clonedData.room = {
        _id: roomId,
      }

      const originalTimezone = data.checkinDate.slice(-6)
      const formattedCheckinDate = dayjs(data.checkinDate).utcOffset(
        originalTimezone
      )
      const formattedCheckoutDate = dayjs(data.checkoutDate).utcOffset(
        originalTimezone
      )

      let arrayOfDatesBooked = util.getArrayOfDatesBooked(
        formattedCheckinDate,
        formattedCheckoutDate
      )

      // update corresponding room record with dates
      await db.collection("rooms").updateOne(
        {
          _id: roomId,
        },
        {
          $push: { datesBooked: { $each: arrayOfDatesBooked } },
        }
      )

      // update corresponding guest record with history
      let bookingData = structuredClone(clonedData)
      delete bookingData.guest
      await db.collection("guests").updateOne(
        {
          _id: new ObjectId(guestId),
        },
        {
          $push: {
            history: {
              category: "booking",
              action: "New Booking",
              data: bookingData,
              by: "Hotel Manager",
              date: new Date(),
            },
            datesOfStay: { $each: arrayOfDatesBooked },
          },
        }
      )

      // insert booking
      await db.collection(collectionName).insertOne(clonedData)

      return res.json({
        message: "booking added successfully",
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }

  async function updateBooking(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let bodyJson = JSON.parse(req.body)
      let newData = structuredClone(bodyJson)
      let guestId = bodyJson.guest
      let roomId = bodyJson.room
      if (guestId) {
        newData.guest = {
          _id: new ObjectId(guestId),
        }
      }
      if (roomId) {
        newData.room = {
          _id: roomId,
        }
      }

      // get original booking data
      let thisBooking = await db.collection(collectionName).findOne({
        _id: new ObjectId(req.query.id),
      })

      let new_formattedCheckinDate = undefined
      let new_formattedCheckoutDate = undefined
      const clientTimezone = thisBooking.checkinDate.slice(-6)
      const original_formattedCheckinDate = util.formatDateFromClient(
        thisBooking.checkinDate,
        clientTimezone
      )
      const original_formattedCheckoutDate = util.formatDateFromClient(
        thisBooking.checkoutDate,
        clientTimezone
      )
      if (newData.checkinDate) {
        new_formattedCheckinDate = util.formatDateFromClient(
          newData.checkinDate,
          clientTimezone
        )
      }
      if (newData.checkoutDate) {
        new_formattedCheckoutDate = util.formatDateFromClient(
          newData.checkoutDate,
          clientTimezone
        )
      }
      let originalDatesBooked = util.getArrayOfDatesBooked(
        original_formattedCheckinDate,
        original_formattedCheckoutDate
      )

      let newDatesBooked = util.getArrayOfDatesBooked(
        new_formattedCheckinDate || original_formattedCheckinDate,
        new_formattedCheckoutDate || original_formattedCheckoutDate
      )
      // **** checkinDate and checkoutDate EXPECTED IN PAYLOAD

      // BOOKING
      let dbResult = await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(req.query.id),
        },
        {
          $set: newData,
        }
      )

      // ORIGINAL ROOM - Only update if room
      let removeDatesFromRoom
      if (!util.arraysEqual(originalDatesBooked, newDatesBooked)) {
        console.log("IN RROOM")

        removeDatesFromRoom = await db.collection("rooms").updateOne(
          {
            _id: parseInt(thisBooking.room._id),
          },
          {
            $pull: { datesBooked: { $in: originalDatesBooked } },
          }
        )

        // NEW ROOM (Potentially)
        let roomToModify =
          bodyJson.room === undefined ? thisBooking.room._id : bodyJson.room
        let addDatesToNewRoom = await db.collection("rooms").updateOne(
          {
            _id: parseInt(roomToModify),
          },
          {
            $push: { datesBooked: { $each: newDatesBooked } },
          }
        )
      }

      // GUEST
      let removeDatesFromGuest
      if (!util.arraysEqual(originalDatesBooked, newDatesBooked)) {
        console.log("IN GGGGG")
        removeDatesFromGuest = await db.collection("guests").updateOne(
          {
            _id: new ObjectId(thisBooking.guest._id),
          },
          {
            $pull: { datesOfStay: { $in: originalDatesBooked } },
          }
        )

        // add booked dates to new room ***** GUEST IS EXPECTED IN PAYLOAD
        let modifyGuestRecord = await db.collection("guests").updateOne(
          {
            _id: new ObjectId(thisBooking.guest._id),
          },
          {
            $push: {
              datesOfStay: { $each: newDatesBooked },
              history: {
                category: "booking",
                action: "Booking Updated",
                data: bodyJson,
                by: "Hotel Manager",
                date: new Date(),
              },
            },
          }
        )
      }

      return res.json({
        message: "Booking updated successfully",
        success: true,
      })
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      })
    }
  }

  async function deleteBooking(req: NextApiRequest, res: NextApiResponse<any>) {
    try {
      let { db } = await connectToDatabase()
      let bookingInfo = await db.collection(collectionName).findOne({
        _id: new ObjectId(req.query.id),
      })

      const originalTimezone = bookingInfo.checkinDate.slice(-6)
      const formattedCheckinDate = dayjs(bookingInfo.checkinDate).utcOffset(
        originalTimezone
      )
      const formattedCheckoutDate = dayjs(bookingInfo.checkoutDate).utcOffset(
        originalTimezone
      )

      let arrayOfDatesBooked = util.getArrayOfDatesBooked(
        formattedCheckinDate,
        formattedCheckoutDate
      )
      let removeDatesFromRoom
      if (bookingInfo.room._id >= 0) {
        removeDatesFromRoom = await db.collection("rooms").updateOne(
          {
            _id: parseInt(bookingInfo.room._id),
          },
          {
            $pull: { datesBooked: { $in: arrayOfDatesBooked } },
          }
        )
      }

      if (removeDatesFromRoom.modifiedCount && bookingInfo.guest._id) {
        await db.collection("guests").updateOne(
          {
            _id: new ObjectId(bookingInfo.guest._id),
          },
          {
            $pull: { datesOfStay: { $in: arrayOfDatesBooked } },
          },
          {
            $push: {
              history: {
                category: "booking",
                action: "Cancelled Booking",
                data: bookingInfo,
                by: "Hotel Manager",
                date: new Date(),
              },
            },
          }
        )

        await db.collection(collectionName).deleteOne({
          _id: new ObjectId(req.query.id),
        })
      }

      return res.json({
        message: "Booking deleted successfully",
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
