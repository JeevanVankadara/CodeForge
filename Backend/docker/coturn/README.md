# TURN relay for voice

Voice is peer-to-peer. Two browsers normally connect directly, and this server
is never involved. But some networks — symmetric NAT, strict corporate
firewalls, a few mobile carriers — refuse to let a direct connection form at
all. For those users a relay is the difference between voice working and voice
sitting at `connecting` forever.

When it is used, **every byte of audio passes through it**, so it is a fallback
and never the default.

## Setup

Add to `Backend/.env`:

```
TURN_URLS=turn:localhost:3478?transport=udp,turn:localhost:3478?transport=tcp
TURN_SECRET=<a long random string>
TURN_REALM=codeforge
# Optional, defaults to 8 hours
TURN_TTL_SECONDS=28800
```

Generate the secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then start it:

```
cd Backend/docker/coturn
docker compose --env-file ../../.env up -d
docker compose logs -f
```

Restart the API afterwards — it reads these at request time, but only advertises
TURN when both `TURN_URLS` and `TURN_SECRET` are present.

For a real deployment, replace `localhost` with the public hostname and
uncomment `external-ip` in `turnserver.conf`. On a cloud VM the machine knows
only its private address and would otherwise advertise a relay nobody can reach.

## How the credentials work

There is no user database on the relay, and no password to leak.

`GET /rtc/ice` mints a short-lived pair per request:

```
username   = <unix expiry timestamp>:<user id>
credential = base64(HMAC-SHA1(TURN_SECRET, username))
```

coturn recomputes the signature with the same secret, checks it matches, and
checks the timestamp has not passed. A credential that leaks is worthless once
it expires, and the secret itself never leaves the two servers.

The browser refetches a minute before expiry, so a long-lived tab never builds a
call on dead credentials.

## Verifying it actually works

The hard part is that a direct connection will succeed and the relay never gets
exercised, so "voice works" proves nothing about TURN. Force it:

```js
localStorage.setItem('codeforge:forceRelay', '1')   // then leave and rejoin voice
```

Every candidate now has to go through TURN. If the call still connects, the
relay is genuinely working. Confirm with:

```js
await __voice.stats()   // route should read "relay -> relay"
```

Then:

```js
localStorage.removeItem('codeforge:forceRelay')
```

> **Testing on one machine?** Forcing relay between two browsers on your own
> computer means relaying to a private address, which `turnserver.conf`
> deliberately refuses — see the `denied-peer-ip` block. Comment out the RFC1918
> lines **only** while testing locally, and put them back afterwards. Left open
> on a public server, this relay will happily forward traffic into your private
> network.

## Cost

Audio is roughly 40 kbps per direction. Relaying a three-person call is under
0.25 Mbit/s, so this is not a bandwidth problem at this scale — but `user-quota`
and `total-quota` in the config are there so it can never become one.
