These are two common **rate limiting** algorithms, used to cap how many requests a client can make. They feel similar, but they work differently and behave differently under bursts of traffic.

## Token bucket: a coffee punch card that refills

Picture a jar on the counter that holds at most **10 tokens**. A barista drops in **1 new token every 6 seconds**. Once the jar is full, any extra tokens just fall on the floor.

- Each time you want to make a request, you have to take a token from the jar.
- If there's a token, you take it and go ahead.
- If the jar is empty, you get rejected (or you wait until the next token drops in).

**What this means in practice:**
- **Bursts are allowed.** If you haven't been around for a while, the jar fills to 10, so you can fire off 10 requests at once.
- **The long-run rate is capped.** After a burst you're limited to the refill rate, which is 1 every 6 seconds (10 per minute).
- **Two settings:** bucket size (the biggest burst you allow) and refill rate (the sustained throughput).

A second analogy is a phone data plan with rollover. Unused data builds up to a cap, and you can spend it all in one binge, but the monthly allowance only refills so fast.

**Implementation is cheap.** You only store two numbers per user: the current token count and the time of the last refill. When a request arrives, you work out how many tokens should have dripped in since then, add them (up to the cap), and subtract one.

## Sliding window: a bouncer who looks back exactly one hour

It helps to start with the simpler **fixed window** and see why it breaks.

**Fixed window: a bouncer with a clicker who resets on the hour.** The rule is 100 people per hour. At 9:00 the clicker goes back to zero. The weakness: 100 people arrive at 8:59 and another 100 at 9:00. Both batches are within the rule, yet 200 people got in within two minutes. Traffic spikes right at the window edges slip through.

**Sliding window: the bouncer who checks the guest log.** There's no reset on the hour. Each time someone shows up, the bouncer asks, "How many people came in during the **last 60 minutes, counting back from right now**?" If the answer is under 100, you're in. The window moves along with the clock, so there's no edge to take advantage of.

There are two common versions:

1. **Sliding window log (exact).** The bouncer writes down every entry time. When someone arrives, entries older than 60 minutes are crossed out and the rest are counted. It's precise, but memory grows with traffic because every timestamp gets stored.

2. **Sliding window counter (approximate).** The bouncer only keeps tallies for this hour and last hour, then estimates. Say it's 9:15, so you're 25% of the way into the current hour. The estimate is:
   \[
   \text{estimate} = \text{current hour count} + \text{previous hour count} \times 0.75
   \]
   The idea is that roughly 75% of last hour's traffic still falls inside the 60-minute lookback. It's cheap (two counters) and accurate enough for most systems.

## Comparison

| | Token bucket | Sliding window |
|---|---|---|
| Analogy | Jar that refills with tokens | Bouncer checking the last 60 minutes |
| Bursts | Allowed, up to bucket size | Smoothed out, no edge spikes |
| State per user | 2 numbers | Log of timestamps, or 2 counters |
| Good for | APIs that should tolerate occasional spikes | Strict quotas like "at most N per rolling hour" |

**Short version:** token bucket asks "do you have credit saved up?" Sliding window asks "how much have you used recently?" Pick token bucket if a quiet user should be able to burst now and then. Pick sliding window if you need a firm cap over any stretch of time.