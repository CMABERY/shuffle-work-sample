/* Shared by the offline page and Node tests. All monetary accounting is integer. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DiceResponse = api;
})(globalThis, function() {
  'use strict';
  const SCHEMA = 'dice-limit-response/1';
  const categories = {
    dice: 'Dice again · same cap',
    changed_cap: 'Dice again · different cap',
    other_game: 'Another game recorded',
    no_accepted: 'No accepted bet observed',
    incomplete: 'Follow-up incomplete',
  };
  function fail(message) { throw new Error(message); }
  function string(value, name) {
    if (typeof value !== 'string' || !value.trim() || value.length > 1000) fail(`${name}: a nonempty string of at most 1,000 characters is required.`);
    return value;
  }
  function timestamp(value, name) {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
    if (!match) fail(`${name}: use an ISO timestamp with timezone and at most millisecond precision.`);
    const [,year,month,day,hour,minute,second,zone] = match;
    const days = new Date(Date.UTC(Number(year),Number(month),0)).getUTCDate();
    if (Number(month)<1 || Number(month)>12 || Number(day)<1 || Number(day)>days || Number(hour)>23 || Number(minute)>59 || Number(second)>59 ||
      (zone!=='Z' && (Number(zone.slice(1,3))>23 || Number(zone.slice(4,6))>59))) fail(`${name}: invalid calendar timestamp.`);
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) fail(`${name}: invalid timestamp.`);
    return parsed;
  }
  function units(value, decimals, name) {
    if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value) || value.length>40) fail(`${name}: use unsigned decimal text, without exponents or commas.`);
    const [whole, fraction=''] = value.split('.');
    if (fraction.length>decimals) fail(`${name}: exceeds the declared currency precision.`);
    return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals,'0') || '0');
  }
  function decimal(value, decimals) {
    const amount = BigInt(value), scale = 10n ** BigInt(decimals);
    const sign = amount<0n?'-':'';
    const n=amount<0n?-amount:amount;
    return sign + String(n/scale) + (decimals ? '.' + String(n%scale).padStart(decimals,'0') : '');
  }
  function normalize(input) {
    if (!input || input.schema!==SCHEMA) fail(`Expected schema ${SCHEMA}. Download the example to see the input format.`);
    if (!['synthetic','export'].includes(input.data_origin)) fail('data_origin must be synthetic or export.');
    const platform=string(input.platform,'platform'), currency=string(input.currency,'currency');
    if (!/^[A-Z][A-Z0-9]{2,11}$/.test(currency)) fail('currency: use a currency code, such as USD.');
    const decimals=input.currency_decimals;
    if (!Number.isInteger(decimals) || decimals<0 || decimals>8) fail('currency_decimals must be an integer from 0 to 8.');
    const cov=input.coverage;
    if (!cov || !['complete','partial','unknown'].includes(cov.status) || !['all','dice_only'].includes(cov.games)) fail('coverage requires status (complete, partial, unknown) and games (all, dice_only).');
    const from=timestamp(cov.from,'coverage.from'), until=timestamp(cov.until,'coverage.until');
    if (from>=until) fail('coverage.until must be later than coverage.from.');
    string(cov.basis,'coverage.basis');
    if (!Array.isArray(input.events) || input.events.length>200000) fail('events must be an array of at most 200,000 requests.');
    const seen=new Map(), events=[];
    let duplicateRows=0;
    input.events.forEach((source,index)=>{
      if (!source || typeof source!=='object') fail(`Event ${index+1}: expected a request object.`);
      const id=string(source.event_id,`Event ${index+1} event_id`), player=string(source.player_id,`Event ${index+1} player_id`);
      const game=string(source.game,`Event ${index+1} game`);
      const at=timestamp(source.at,`Event ${index+1} at`);
      if (at<from || at>=until) fail(`Event ${index+1}: timestamp is outside the declared [from, until) export interval.`);
      if (cov.games==='dice_only' && game!=='dice') fail(`Event ${index+1}: another game contradicts dice_only coverage.`);
      const seq=source.sequence ?? null;
      if (seq!==null && (!Number.isSafeInteger(seq) || seq<0)) fail(`Event ${index+1}: sequence must be a nonnegative safe integer.`);
      const kind=source.outcome;
      if (!['accepted','limit_refused','limit_clipped','other_refused'].includes(kind)) fail(`Event ${index+1}: unsupported outcome.`);
      const requested=units(source.requested_stake,decimals,`Event ${index+1} requested_stake`);
      const accepted=units(source.accepted_stake,decimals,`Event ${index+1} accepted_stake`);
      const cap=units(source.stake_cap,decimals,`Event ${index+1} stake_cap`);
      if (requested<=0n || cap<=0n || accepted>requested) fail(`Event ${index+1}: invalid stake or cap.`);
      if (kind==='accepted' && (accepted!==requested || accepted>cap)) fail(`Event ${index+1}: an accepted request must admit its requested stake within the cap.`);
      if (kind==='limit_clipped' && (requested<=cap || accepted!==cap)) fail(`Event ${index+1}: clipping requires a request above the cap and an accepted stake equal to it.`);
      if (kind==='limit_refused' && (requested<=cap || accepted!==0n)) fail(`Event ${index+1}: a limit refusal requires a request above the cap and zero accepted stake.`);
      if (kind==='other_refused' && accepted!==0n) fail(`Event ${index+1}: a refused request cannot have an accepted stake.`);
      const key=JSON.stringify([player,id]);
      const canonical=JSON.stringify([player,id,at,seq,game,kind,String(requested),String(accepted),String(cap)]);
      if (seen.has(key)) {
        const prior=seen.get(key);
        if (prior.canonical!==canonical) fail(`Conflicting copies of request ${id} for player ${player}. Resolve the source conflict before analysis.`);
        prior.sourceEvents.push(index+1);duplicateRows++;return;
      }
      const event={id,player,game,at,iso:source.at,sequence:seq,kind,requested,accepted,cap,sourceEvents:[index+1],canonical};
      seen.set(key,event);events.push(event);
    });
    const players=new Map();
    for (const event of events) {
      if (!players.has(event.player)) players.set(event.player,[]);
      players.get(event.player).push(event);
    }
    for (const [player,rows] of players) {
      rows.sort((a,b)=>a.at-b.at || (a.sequence??0)-(b.sequence??0));
      for (let i=1;i<rows.length;i++) {
        if (rows[i-1].at===rows[i].at && (rows[i-1].sequence===null || rows[i].sequence===null || rows[i-1].sequence===rows[i].sequence)) {
          fail(`Player ${player}: equal timestamps need distinct source sequence values; order cannot be inferred.`);
        }
      }
    }
    return {input,platform,currency,decimals,coverage:cov,from,until,events,players,duplicateRows};
  }
  function publicEvent(e,decimals) {
    return {event_id:e.id,player_id:e.player,at:e.iso,sequence:e.sequence,game:e.game,outcome:e.kind,
      requested_stake:decimal(e.requested,decimals),accepted_stake:decimal(e.accepted,decimals),stake_cap:decimal(e.cap,decimals),source_events:e.sourceEvents};
  }
  function analyze(data, options={}) {
    const minutes=options.windowMinutes ?? 5;
    if (!Number.isInteger(minutes) || minutes<1 || minutes>1440) fail('Follow-up window must be a whole number of minutes from 1 to 1,440.');
    const mode=options.encounters ?? 'all';
    if (!['all','refused'].includes(mode)) fail('encounters must be all or refused.');
    const counts=Object.fromEntries(Object.keys(categories).map(k=>[k,0]));
    const cohort=[];
    let turnover=0n, coveredWindows=0;
    for (const [player,rows] of data.players) {
      const first=rows.findIndex(e=>e.game==='dice' && (e.kind==='limit_refused' || (mode==='all' && e.kind==='limit_clipped')));
      if (first===-1) continue;
      const encounter=rows[first], deadline=encounter.at+minutes*60000;
      const followup=rows.slice(first+1).filter(e=>e.at<deadline);
      const firstAccepted=followup.find(e=>e.accepted>0n);
      const fullyCovered=data.coverage.status==='complete' && data.coverage.games==='all' && deadline<=data.until;
      let category;
      if (firstAccepted) category=firstAccepted.game!=='dice'?'other_game':firstAccepted.cap!==encounter.cap?'changed_cap':'dice';
      else category=fullyCovered?'no_accepted':'incomplete';
      counts[category]++;
      if (fullyCovered) coveredWindows++;
      const wagered=followup.reduce((sum,e)=>sum+e.accepted,0n);
      turnover+=wagered;
      const gaps=[];
      if (data.coverage.status!=='complete') gaps.push(`Export coverage is declared ${data.coverage.status}.`);
      if (data.coverage.games!=='all') gaps.push('Only Dice activity is covered; activity in other games may be missing.');
      if (deadline>data.until) gaps.push('The export ends before the follow-up window does.');
      cohort.push({player,category,encounter:publicEvent(encounter,data.decimals),deadline:new Date(deadline).toISOString(),
        next_accepted:firstAccepted?publicEvent(firstAccepted,data.decimals):null,
        next_recorded_delay_seconds:firstAccepted?(firstAccepted.at-encounter.at)/1000:null,
        fully_covered:fullyCovered,coverage_gaps:gaps,followup_turnover:decimal(wagered,data.decimals),
        subsequent_requests:followup.length,source_path:[publicEvent(encounter,data.decimals),...followup.map(e=>publicEvent(e,data.decimals))]});
    }
    cohort.sort((a,b)=>Date.parse(a.encounter.at)-Date.parse(b.encounter.at) || a.player.localeCompare(b.player));
    return {schema:'dice-limit-response-result/1',data_origin:data.input.data_origin,platform:data.platform,currency:data.currency,
      source_rows:data.input.events.length,unique_requests:data.events.length,duplicate_rows:data.duplicateRows,players_in_export:data.players.size,
      cohort_players:cohort.length,covered_windows:coveredWindows,window_minutes:minutes,encounters:mode,
      counts,followup_turnover:decimal(turnover,data.decimals),coverage:data.coverage,cohort,
      interpretation:'Descriptive activity after each player’s first qualifying Dice limit encounter in the supplied interval. The first subsequent accepted request is the next one recorded, not proof of a causal response. No accepted bet within a covered window is not proof of departure. Coverage is declared by the input, not independently authenticated. Percentages use all cohort players, including incomplete follow-up.',
      interval:'Events after the encounter in source order and strictly before encounter time + window. The terminal boundary is excluded.'};
  }
  return {SCHEMA,categories,normalize,analyze,decimal,timestamp};
});
