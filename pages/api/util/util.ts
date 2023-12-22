import { Dayjs } from "dayjs"
const dayjs = require("dayjs")

function addOneDayToDate(_date: any) {
  const a = dayjs(_date)
  return a.add(1, "day")
}

function getArrayOfDatesBooked(checkinDate: Dayjs, checkoutDate: Dayjs) {
  let arrayOfDatesBooked: Array<string> = []
  if (checkinDate.isSame(checkoutDate, "day")) {
    arrayOfDatesBooked.push(checkinDate.format("YYYY-MM-DD"))
  }
  if (checkinDate.isBefore(checkoutDate, "day")) {
    var dateWithinRange = true
    var cyclingDate = checkinDate
    while (dateWithinRange) {
      if (dayjs(cyclingDate).isSame(checkoutDate, "day")) {
        arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
        dateWithinRange = false
        break
      } else if (dayjs(cyclingDate).isBefore(checkoutDate, "day")) {
        arrayOfDatesBooked.push(dayjs(cyclingDate).format("YYYY-MM-DD"))
        cyclingDate = addOneDayToDate(cyclingDate)
      }
    }
  }
  return arrayOfDatesBooked
}

function arraysEqual(a: any[], b: any[]) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// function getArrayOfDatesBooked(bookingInfo: any) {
//   let arrayOfDatesBooked: Array<string> = [];
//   if(dayjs(bookingInfo.checkinDate).isSame(dayjs(bookingInfo.checkoutDate), 'day' )) {
//     arrayOfDatesBooked.push(dayjs(bookingInfo.checkinDate).format('YYYY-MM-DD'))
//   }
//   if(dayjs(bookingInfo.checkinDate).isBefore( dayjs(bookingInfo.checkoutDate), 'day') ) {
//     var dateWithinRange = true;
//     var cyclingDate = dayjs(bookingInfo.checkinDate);
//     while(dateWithinRange) {
//       if(dayjs(cyclingDate).isSame(dayjs(bookingInfo.checkoutDate), 'day') ) {
//         arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'))
//         dateWithinRange = false;
//         break;
//       } else if( dayjs(cyclingDate).isBefore( dayjs(bookingInfo.checkoutDate), 'day' ) ) {
//         arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'));
//         cyclingDate = addOneDayToDate(cyclingDate);
//       }
//     }
//   }
//   return arrayOfDatesBooked
// }

function formatDateFromClient(date: Dayjs, clientTimezone: string) {
  return dayjs(date).utcOffset(clientTimezone)
}

module.exports = { arraysEqual, getArrayOfDatesBooked, formatDateFromClient }
