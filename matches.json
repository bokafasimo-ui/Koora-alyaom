const fs = require('fs');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const API_HOST = 'api.football-data.org';

if (!API_KEY) {
  console.error('Missing FOOTBALL_DATA_API_KEY secret.');
  process.exit(1);
}

const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

function todayDateUTC() {
  return new Date().toISOString().split('T')[0];
}

function addDaysUTC(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

async function main() {
  const today = todayDateUTC();
  const dateFrom = addDaysUTC(today, -1);
  const dateTo = addDaysUTC(today, 1);

  const COMPETITIONS = 'WC,CL,PL,PD,BL1,SA,FL1,ELC,PPL,DED,EC,BSA';

  const url = `https://${API_HOST}/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=${COMPETITIONS}`;

  const res = await fetch(url, {
    headers: {
      'X-Auth-Token': API_KEY,
    },
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${res.statusText} - ${errBody}`);
  }

  const data = await res.json();
  const fixtures = data.matches || [];

  console.log(`URL used: ${url}`);
  console.log(`Matches returned: ${fixtures.length}`);

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
  console.log(`Saved ${matches.length} matches to matches.json`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
