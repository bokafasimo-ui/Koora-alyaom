/**
 * هذا السكريبت يعمل فقط داخل GitHub Actions (على خوادم GitHub)
 * ولا يعمل في المتصفح، وبالتالي مفتاح الـ API لا يُكشف أبداً للزوار.
 *
 * المصدر المستخدم: football-data.org
 * التوثيق: https://www.football-data.org/documentation/quickstart
 *
 * وظيفته:
 * 1. جلب مباريات اليوم من football-data.org باستخدام المفتاح السري.
 * 2. تحويلها إلى صيغة بسيطة تناسب صفحتنا.
 * 3. حفظها في ملف matches.json داخل المستودع.
 */

const fs = require('fs');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const API_HOST = 'api.football-data.org';

if (!API_KEY) {
  console.error('❌ لم يتم العثور على المفتاح FOOTBALL_DATA_API_KEY. تأكد من إضافته في GitHub Secrets.');
  process.exit(1);
}

// الحالات التي تعني أن المباراة جارية الآن فعلياً (مباشر)
// راجع التوثيق: TIMED, SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED, POSTPONED, SUSPENDED, CANCELLED
const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

function todayDateUTC() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function main() {
  const date = todayDateUTC();
  const url = `https://${API_HOST}/v4/matches?dateFrom=${date}&dateTo=${date}`;

  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`فشل الاتصال بالـ API: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const fixtures = data.matches || [];

  const matches = fixtures.map((f) => {
    const status = f.status || '';
    const utcDate = f.utcDate ? new Date(f.utcDate) : null;

    const time = utcDate
      ? utcDate.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        })
      : '';

    return {
      home: f.homeTeam?.name || '',
      away: f.awayTeam?.name || '',
      league: f.competition?.name || '',
      time,
      isLive: LIVE_STATUSES.has(status),
    };
  });

  const output = {
    updatedAt: new Date().toISOString(),
    matches,
  };

  fs.writeFileSync('matches.json', JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ تم حفظ ${matches.length} مباراة في matches.json`);
}

main().catch((err) => {
  console.error('❌ حدث خطأ:', err);
  process.exit(1);
});
