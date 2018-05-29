import * as $ from 'jquery';
import { initTimeZoneSmall } from 'ks-date-time-zone/dist/ks-timezone-small';
import * as Cookies from 'js-cookie';

import { initClock, startClock, triggerRefresh } from './clock';
import { initForecast, updateForecast, showUnknown, refreshForecastFromCache } from './forecast';
import { initSettings, openSettings } from './settings';
import './util';

initTimeZoneSmall();

let latitude;
let longitude;
let city;
let userId;

let frequent = false;
let lastHour = -1;
// Make sure most clients stagger their polling so that the weather server isn't likely
// to get lots of simultaneous requests.
const pollingMinute = Math.floor(Math.random() * 15);
const pollingMillis = Math.floor(Math.random() * 60000);

$(() => {
  let lastForecast = 0;
  const dialogWrapper = $('.dialog-wrapper');
  const cityLabel = $('#city');

  latitude = Number(Cookies.get('latitude')) || 42.75;
  longitude = Number(Cookies.get('longitude')) || -71.48;
  city = Cookies.get('city') || 'Nashua, NH';
  userId = Cookies.get('id') || '';

  initClock();
  initForecast();
  initSettings();
  cityLabel.text(city);

  startClock((hour, minute, forceRefresh) => {
    const now = Date.now();

    // If it's a new day, make sure we update the weather display to show the change of day,
    // even if we aren't polling for new weather data right now.
    if (hour < lastHour || hour === 0 && minute === 0)
      refreshForecastFromCache();

    lastHour = hour;

    const interval = (frequent ? 5 : 15);
    const runningLate = (lastForecast + interval * 60000 <= now);
    const minuteOffset = (frequent ? 0 : pollingMinute);
    const millisOffset = (frequent || forceRefresh || runningLate ? 0 : pollingMillis);

    if (forceRefresh || minute % interval === minuteOffset || runningLate) {
      const doUpdate = () => {
        updateForecast(latitude, longitude, userId).then(isFrequent => {
          if (isFrequent !== undefined)
            frequent = isFrequent;
        });

        lastForecast = now;
      };

      if (millisOffset === 0)
        doUpdate();
      else
        setTimeout(doUpdate, millisOffset);
    }
  });

  $('#settings-btn').on('click', () => {
    const previousSettings = {city, latitude, longitude, userId};

    openSettings(previousSettings, newSettings => {
      if (newSettings) {
        showUnknown();
        ({city, latitude, longitude, userId} = newSettings);
        Cookies.set('city', city, {expires: 36525});
        Cookies.set('latitude', latitude, {expires: 36525});
        Cookies.set('longitude', longitude, {expires: 36525});
        Cookies.set('id', userId, {expires: 36525});
        cityLabel.text(city);
        triggerRefresh();
      }
    });
  });

  dialogWrapper.on('click', event => {
    if (event.shiftKey)
      dialogWrapper.css('display', 'none');
  });
});