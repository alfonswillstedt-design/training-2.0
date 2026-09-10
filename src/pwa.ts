import { registerSW } from 'virtual:pwa-register';

/**
 * Håller den installerade appen uppdaterad.
 *
 * Service workern byts ut av sig själv, men sidan som redan är laddad fortsätter
 * visa den gamla versionen tills något laddar om den. Utan det här behövdes två
 * omladdningar för att se en ändring — och en app som ligger på hemskärmen
 * återupptas ofta ur minnet i stället för att laddas om alls, så den kunde bli
 * kvar på en gammal version i dagar.
 *
 * Omladdningen är tyst med flit. Det finns aldrig något osparat att förlora:
 * varje ändring skrivs direkt, så det finns inget att fråga om.
 */
export function keepUpToDate(): void {
  if (!('serviceWorker' in navigator)) return;

  // Fanns ingen service worker sedan tidigare är det här första besöket. Då
  // ska sidan inte laddas om — det är ingen uppdatering, det är en start.
  const hadController = navigator.serviceWorker.controller !== null;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      const leta = () => void registration.update();
      // Appen öppnas oftare än den laddas om. Att leta när den kommer fram i
      // förgrunden fångar det fall en hemskärmsapp aldrig skulle upptäcka.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') leta();
      });
      window.setInterval(leta, 60 * 60 * 1000);
    },
  });
}
