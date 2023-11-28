
const dayjs = require('dayjs')

function addOneDayToDate(_date: any) {
  const a = dayjs(_date)
  return a.add(1, 'day')
}

function getArrayOfDatesBooked(bookingInfo: any) {
  let arrayOfDatesBooked: Array<string> = [];
  if(dayjs(bookingInfo.checkinDate).isSame(dayjs(bookingInfo.checkoutDate), 'day' )) {
    arrayOfDatesBooked.push(dayjs(bookingInfo.checkinDate).format('YYYY-MM-DD'))
  }
  if(dayjs(bookingInfo.checkinDate).isBefore( dayjs(bookingInfo.checkoutDate), 'day') ) {
    var dateWithinRange = true;
    var cyclingDate = dayjs(bookingInfo.checkinDate);
    while(dateWithinRange) {
      if(dayjs(cyclingDate).isSame(dayjs(bookingInfo.checkoutDate), 'day') ) {
        arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'))
        dateWithinRange = false;
        break;
      } else if( dayjs(cyclingDate).isBefore( dayjs(bookingInfo.checkoutDate), 'day' ) ) {
        arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'));
        cyclingDate = addOneDayToDate(cyclingDate);
      }
    }
  }
  return arrayOfDatesBooked
}

module.exports = { getArrayOfDatesBooked };
