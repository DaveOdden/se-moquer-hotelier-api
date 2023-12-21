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
      let guestId = data.guest
      let roomId = data.room
      data.guest = {
        _id: new ObjectId(guestId),
      }
      data.room = {
        _id: roomId,
      }

      const addOneDayToDate = (_date: any) => {
        const a = dayjs(_date)
        return a.add(1, "day")
      }

      let arrayOfDatesBooked: Array<string> = []

      const originalTimezone = data.checkinDate.slice(-6)
      const formattedCheckinDate = dayjs(data.checkinDate).utcOffset(
        originalTimezone
      )
      const formattedCheckoutDate = dayjs(data.checkoutDate).utcOffset(
        originalTimezone
      )

      if (formattedCheckinDate.isBefore(formattedCheckoutDate, "day")) {
        var dateWithinRange = true
        var cyclingDate = formattedCheckinDate
        while (dateWithinRange) {
          if (dayjs(cyclingDate).isSame(formattedCheckoutDate, "day")) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
            dateWithinRange = false
            break
          } else if (
            dayjs(cyclingDate).isBefore(formattedCheckoutDate, "day")
          ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
            cyclingDate = addOneDayToDate(cyclingDate)
          }
        }
      }

      console.log(arrayOfDatesBooked)

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
      let bookingData = structuredClone(data)
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
      await db.collection(collectionName).insertOne(data)

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
      newData.room = {
        _id: roomId,
      }

      // get original booking data
      let thisBooking = await db.collection(collectionName).findOne({
        _id: new ObjectId(req.query.id),
      })

      if (newData.checkinDate === undefined) {
        newData.checkinDate = thisBooking.checkinDate
      }

      if (newData.checkoutDate === undefined) {
        newData.checkoutDate = thisBooking.checkoutDate
      }

      const clientTimezone = thisBooking.checkinDate.slice(-6)
      const original_formattedCheckinDate = util.formatDateFromClient(
        thisBooking.checkinDate,
        clientTimezone
      )
      const original_formattedCheckoutDate = util.formatDateFromClient(
        thisBooking.checkoutDate,
        clientTimezone
      )
      const new_formattedCheckinDate = util.formatDateFromClient(
        newData.checkinDate,
        clientTimezone
      )
      const new_formattedCheckoutDate = util.formatDateFromClient(
        newData.checkoutDate,
        clientTimezone
      )

      let originalDatesBooked = util.getArrayOfDatesBooked(
        original_formattedCheckinDate,
        original_formattedCheckoutDate
      )
      let newDatesBooked = util.getArrayOfDatesBooked(
        new_formattedCheckinDate,
        new_formattedCheckoutDate
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

      // ORIGINAL ROOM
      let removeDatesFromRoom
      if (thisBooking.room._id >= 0) {
        removeDatesFromRoom = await db.collection("rooms").updateOne(
          {
            _id: parseInt(thisBooking.room._id),
          },
          {
            $pull: { datesBooked: { $in: originalDatesBooked } },
          }
        )
      }

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

      // GUEST
      let removeDatesFromGuest
      if (thisBooking.room._id >= 0) {
        removeDatesFromGuest = await db.collection("guests").updateOne(
          {
            _id: new ObjectId(guestId),
          },
          {
            $pull: { datesOfStay: { $in: originalDatesBooked } },
          }
        )
      }

      // add booked dates to new room ***** GUEST IS EXPECTED IN PAYLOAD
      let modifyGuestRecord = await db.collection("guests").updateOne(
        {
          _id: new ObjectId(guestId),
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

      console.log(dbResult)
      console.log(removeDatesFromRoom)
      console.log(addDatesToNewRoom)
      console.log(removeDatesFromGuest)
      console.log(modifyGuestRecord)

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

      const addOneDayToDate = (_date: any) => {
        const a = dayjs(_date)
        return a.add(1, "day")
      }

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

      let arrayOfDatesBooked: Array<string> = []
      if (formattedCheckinDate.isSame(formattedCheckoutDate, "day")) {
        arrayOfDatesBooked.push(formattedCheckinDate.format("YYYY-MM-DD"))
      }
      if (formattedCheckinDate.isBefore(formattedCheckoutDate, "day")) {
        var dateWithinRange = true
        var cyclingDate = formattedCheckinDate
        while (dateWithinRange) {
          if (dayjs(cyclingDate).isSame(formattedCheckoutDate, "day")) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
            dateWithinRange = false
            break
          } else if (
            dayjs(cyclingDate).isBefore(formattedCheckoutDate, "day")
          ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
            cyclingDate = addOneDayToDate(cyclingDate)
          }
        }
      }

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
