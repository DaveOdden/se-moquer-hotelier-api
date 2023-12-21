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
      const utcOffset = req.query.utcOffset
      dayjs().utcOffset(utcOffset)
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

      // if (
      //   dayjs(data.checkinDate)
      //     .format()
      //     .isSame(dayjs(data.checkoutDate), "day")
      //     .format()
      // ) {
      //   arrayOfDatesBooked.push(dayjs(data.checkinDate).format("YYYY-MM-DD"))
      // }

      console.log("")
      console.log("dates and comparison")
      console.log(dayjs().utcOffset())
      console.log(data.checkinDate)

      console.log(dayjs(data.checkinDate).format())
      console.log(dayjs().utc(data.checkinDate).utcOffset(utcOffset))

      console.log(
        dayjs()
          .utc(data.checkinDate)
          .isBefore(dayjs().utc(data.checkinDate), "day")
      )

      if (dayjs(data.checkinDate).isBefore(dayjs(data.checkoutDate), "day")) {
        var dateWithinRange = true
        var cyclingDate = dayjs(data.checkinDate)
        //console.log(dayjs(data.checkinDate))
        while (dateWithinRange) {
          if (dayjs(cyclingDate).isSame(dayjs(data.checkoutDate), "day")) {
            console.log("is same date. stop looping")
            arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
            dateWithinRange = false
            break
          } else if (
            dayjs(cyclingDate).isBefore(dayjs(data.checkoutDate), "day")
          ) {
            console.log("not same date. keep looping")

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
      // delete newData._id
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

      let originalDatesBooked = util.getArrayOfDatesBooked(thisBooking)
      let newDatesBooked = util.getArrayOfDatesBooked(newData) // **** checkinDate and checkoutDate EXPECTED IN PAYLOAD

      // update booking
      let dbResult = await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(req.query.id),
        },
        {
          $set: newData,
        }
      )

      // remove original booked dates from room's datesBooked array
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

      // remove original booked dates from room's datesBooked array
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

      // add booked dates to new room ***** ROOM IS EXPECTED IN PAYLOAD
      let addDatesToNewRoom = await db.collection("rooms").updateOne(
        {
          _id: parseInt(bodyJson.room),
        },
        {
          $push: { datesBooked: { $each: newDatesBooked } },
        }
      )

      // add booked dates to new room ***** GUEST IS EXPECTED IN PAYLOAD
      let addDatesToNewGuest = await db.collection("guests").updateOne(
        {
          _id: new ObjectId(guestId),
        },
        {
          $push: { datesOfStay: { $each: newDatesBooked } },
        }
      )

      // update guest history
      await db.collection("guests").updateOne(
        {
          _id: new ObjectId(thisBooking.guest._id),
        },
        {
          $push: {
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
      let roomInfo: any

      const addOneDayToDate = (_date: any) => {
        const a = dayjs(_date)
        return a.add(1, "day")
      }

      let bookingInfo = await db.collection(collectionName).findOne({
        _id: new ObjectId(req.query.id),
      })

      let arrayOfDatesBooked: Array<string> = []
      if (
        dayjs(bookingInfo.checkinDate).isSame(
          dayjs(bookingInfo.checkoutDate),
          "day"
        )
      ) {
        arrayOfDatesBooked.push(
          dayjs(bookingInfo.checkinDate).format("YYYY-MM-DD")
        )
      }
      if (
        dayjs(bookingInfo.checkinDate).isBefore(
          dayjs(bookingInfo.checkoutDate),
          "day"
        )
      ) {
        var dateWithinRange = true
        var cyclingDate = dayjs(bookingInfo.checkinDate)
        while (dateWithinRange) {
          if (
            dayjs(cyclingDate).isSame(dayjs(bookingInfo.checkoutDate), "day")
          ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
            dateWithinRange = false
            break
          } else if (
            dayjs(cyclingDate).isBefore(dayjs(bookingInfo.checkoutDate), "day")
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
