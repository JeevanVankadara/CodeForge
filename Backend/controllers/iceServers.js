// Hands the browser the servers it should use to discover how it can be reached
// from the outside world.
//
// Two kinds exist, and they do very different jobs:
//
//   STUN  answers one question - "what does my address look like from out
//         there?" - and then gets out of the way. Free, trivial, and enough
//         whenever the two routers are willing to let a direct connection form.
//
//   TURN  is a relay for when no direct connection can be formed at all
//         (symmetric NAT, strict corporate firewalls). Every byte of audio
//         passes through it, so it costs real bandwidth - which is exactly why
//         it must never be handed out as a password anyone can keep.
//
// TURN is optional. With TURN_URLS and TURN_SECRET unset this returns STUN only
// and voice behaves as it did before Phase 6: fine on ordinary home networks,
// and permanently stuck at "connecting" behind a strict one.

const crypto = require('crypto');

// Several, because one STUN host being down should not take voice with it.
const DEFAULT_STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];

// Long enough that a working call is never interrupted, short enough that a
// leaked credential is worth little. The browser refetches before expiry.
const DEFAULT_TTL_SECONDS = 8 * 60 * 60;

const parseList = (value) =>
  (value || '').split(',').map((entry) => entry.trim()).filter(Boolean);

// The TURN REST API scheme that coturn implements under `use-auth-secret`.
//
// The username is simply an expiry timestamp, and the password is that username
// signed with a secret shared only between this process and the TURN server.
// coturn keeps no user list: it recomputes the signature, checks it matches, and
// checks the timestamp has not passed. That is the whole protocol.
//
// So a credential that leaks is worth nothing after its expiry, and nobody has
// to run a user database on the relay.
const mintTurnCredentials = (secret, ttlSeconds, label) => {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiresAt}:${label}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  return { username, credential, expiresAt };
};

const iceServers = (req, res) => {
  const stunUrls = parseList(process.env.STUN_URLS);
  const servers = [{ urls: stunUrls.length ? stunUrls : DEFAULT_STUN }];

  const turnUrls = parseList(process.env.TURN_URLS);
  const secret = process.env.TURN_SECRET;
  let expiresAt = null;

  if (turnUrls.length && secret) {
    const ttl = Number(process.env.TURN_TTL_SECONDS) || DEFAULT_TTL_SECONDS;
    // Labelled with the user id so a relay session in the coturn log can be
    // traced back to an account. It is not a secret and is not trusted.
    const minted = mintTurnCredentials(secret, ttl, String(req.user?.id ?? 'anon'));

    servers.push({
      urls: turnUrls,
      username: minted.username,
      credential: minted.credential,
    });
    expiresAt = minted.expiresAt;
  }

  res.status(200).json({
    iceServers: servers,
    // Only relay when nothing else works. 'relay' would force it - useful for
    // proving TURN is wired up, wasteful for anything else.
    iceTransportPolicy: 'all',
    // Lets the browser drop its cached copy before these stop working.
    expiresAt,
  });
};

module.exports = { iceServers, mintTurnCredentials };
