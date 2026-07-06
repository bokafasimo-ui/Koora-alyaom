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

function addDaysUTC(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

async function main() {
  const today = todayDateUTC();
  // نوسّع النطاق يوماً قبل ويوماً بعد لتفادي فقدان مباريات بسبب فرق التوقيت (UTC مقابل توقيتك المحلي)
  const dateFrom = addDaysUTC(today, -1);
  const dateTo = addDaysUTC(today, 1);

  // تحديد البطولات المجانية المتاحة صريحاً (يشمل كأس العالم WC)
  const COMPETITIONS = 'WC,CL,PL,PD,BL1,SA,FL1,ELC,PPL,DED,EC,BSA';

  const url = `https://${API_HOST}/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=${COMPETITIONS}`;

  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': API_KEY,
    },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`فشل الاتصال بالـ API: ${res.status} ${res.statusText} — ${errBody}`);
  }

  const data = await res.json();
  const fixtures = data.matches || [];

  console.log(`ℹ️ الرابط المستخدم: ${url}`);
  console.log(`ℹ️ عدد المباريات المسترجعة من الـ API: ${fixtures.length}`);

  const matches = fixtures.map((f) => {
    const status = f.status || '';
    const utcDate = f.utcDate ? new Date(f.utcDate) : null;

    // نبني الوقت يدوياً بأرقام إنجليزية عادية (123) بدل الأرقام العربية الهندية،
    // وبتوقيت غرينيتش (UTC/GMT) الدقيق، مع إضافة تسمية GMT صريحة
    const time = utcDate
      ? `${String(utcDate.getUTCHours()).padStart(2, '0')}:${String(utcDate.getUTCMinutes()).padStart(2, '0')} GMT`
      : '';

    return {
      home: f.homeTeam?.name || '',
      away: f.awayTeam?.name || '',
      league: f.competition?.name || '',
      date: utcDate ? utcDate.toISOString().split('T')[0] : '',
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
