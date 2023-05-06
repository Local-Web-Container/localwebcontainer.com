const _millisecond = 1;
const _second = _millisecond * 1000;
const _minute = _second * 60;
const _hour = _minute * 60;
const _day = _hour * 24;
const _week = _day * 7;
const _month = _day * 30;
const _year = _day * 365;

const rtf = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  localeMatcher: 'best fit',
  style: 'long'
})

/**
 * @param {Date} from
 * @param {Date} to
 * @return {[Number, Intl.RelativeTimeFormatUnit]}
 */
function lookup(from, to) {
  const delta = Math.abs((+to) - (+from));
  const sign = Math.sign((+to) - (+from));

  const years = Math.round(delta / _year);
  if (years > 1) return [sign * years, 'year'];

  const year = Math.abs(to.getFullYear() - from.getFullYear());
  const months = Math.round(delta / _month);
  if (months > 4) return [sign * year, 'year'];
  if (months > 1) return [sign * months, 'month'];

  const month = Math.abs(to.getMonth() - from.getMonth());
  const weeks = Math.round(delta / _week);
  if (weeks > 3) return [sign * month, 'month'];
  if (weeks > 1) return [sign * weeks, 'week'];

  const weekDist = (to.getDay() || 7) - (from.getDay() || 7);
  const week = Math.abs(weekDist) > 4 ? 0 : 1;
  const days = Math.round(delta / _day);
  if (days > 4) return [sign * week, 'week'];
  if (days > 1) return [sign * days, 'day'];

  const day = Math.abs(to.getDate() - from.getDate());
  const hours = Math.round(delta / _hour);
  if (hours > 12) return [sign * day, 'day'];
  if (hours > 1) return [sign * hours, 'hour'];

  const hour = Math.abs(to.getHours() - from.getHours());
  const minutes = Math.round(delta / _minute);
  if (minutes > 40) return [sign * hour, 'hour'];

  const minute = Math.abs(to.getMinutes() - from.getMinutes());
  const seconds = Math.round(delta / _second);
  if (minutes > 1) return [sign * minutes, 'minute'];
  if (seconds > 20) return [sign * minute, 'minute'];

  return [sign * seconds, 'second'];
}

var detailed = false
var interval
function watch () {
  interval ??= setInterval(found => {
    document.querySelectorAll('time').forEach(el => {
      found = el.innerText = rtf.format(...lookup(new Date(), new Date(el.dateTime)))
    })
    found || (clearInterval(interval), interval = undefined)
  }, 1000);
}

function toggle() {
  detailed = !detailed
  if (detailed) {
    document.querySelectorAll('time').forEach(el => {
      el.innerText = el.title;
    })
    clearInterval(interval)
    interval = undefined
  } else {
    watch()
    document.querySelectorAll('time').forEach(el => {
      el.innerText = rtf.format(...lookup(new Date(), new Date(el.dateTime)))
    })
  }
}

export default function relativeTime (to, from = new Date()) {
  to = to instanceof Date ? to : new Date(to)
  from = from instanceof Date ? from : new Date(from)
  const t = document.createElement('time')
  t.dateTime = to.toJSON()
  t.title = to.toLocaleString()
  t.ondblclick = toggle
  t.innerText = detailed ? t.title : (watch(), rtf.format(...lookup(from, to)))
  return t
}
