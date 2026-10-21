"""B-78vx: Luceras slice clips as code (idle loop and sig.horns-first-descent).

Pure Python (no bpy). A clip is a function of time (ms) that returns a pose spec in the creature's own terms;
``pose_rig.py`` turns a spec into joint transforms on the approved rig and bakes it at 30 fps.

Space: meters, +Z up, the creature faces -Y. ``f`` is forward (= -Y). Angles are degrees.
Pose spec (all keys optional, missing values are rest):
  body      (f, z, pitch, roll, yaw, side): body center offset from its rest place, in place (root never moves);
            pitch is nose-up positive about the body center
  bend      spine_02..05 nose-up bend per joint
  breath    0..1 of the approved breath_in chest expansion
  neck      (neck_01, neck_02) nose-up; head nose-up; neck_yaw / head_yaw (left positive); jaw open
  ears      {"l": (back, lift), "r": (back, lift)}
  tail      idle: list of (lift, yaw) per joint, relative rotations; signature ("tail_mode": "straighten"): list of
            {s, lift, yaw} per joint, where s blends the joint's rest angle toward the in-line angle tail_target_deg
            (body frame, 0 = straight back, positive up) and lift is added on top (B-378v: 9 joints, tail_07..tail_09
            are the sprite-only plume bones; a rig with fewer tail bones ignores the extra entries)
  legs      {leg: {"fk": (a1, a2, a3), "plant": w, "roll": heel lift, "anchor": (df, dz)}}

Shared primitives (roster layer section 3): eased key tracks, lag down a chain, a breathing cycle, anticipation
and overshoot curves. The two-link foot solver against the ground lives in pose_rig.py (it needs the rig).
"""

import math

FPS = 30
LEGS = ("fl", "fr", "hl", "hr")


# -- primitives -----------------------------------------------------------------------------------------------

def clamp01(u):
    return max(0.0, min(1.0, u))


def ease(kind, u):
    u = clamp01(u)
    if kind == "linear":
        return u
    if kind == "in":
        return u * u
    if kind == "in3":
        return u * u * u
    if kind == "out":
        return 1 - (1 - u) ** 2
    if kind == "out3":
        return 1 - (1 - u) ** 3
    if kind == "hold":
        return 0.0 if u < 1 else 1.0
    if kind == "back":  # overshoot then settle (about 8 percent past the key)
        s = 1.70158
        v = u - 1
        return 1 + v * v * ((s + 1) * v + s)
    return u * u * (3 - 2 * u)  # smooth


class Track:
    """Keys ``[(ms, ease_into_this_key, {param: value})]``; a param missing from a key holds 0 (rest)."""

    def __init__(self, keys):
        self.keys = sorted(keys, key=lambda k: k[0])
        self.params = sorted({k for _, _, v in keys for k in v})

    def __call__(self, t):
        keys = self.keys
        if t <= keys[0][0]:
            return {k: keys[0][2].get(k, 0.0) for k in self.params}
        for (t0, _, p0), (t1, kind, p1) in zip(keys, keys[1:]):
            if t0 <= t <= t1:
                u = ease(kind, (t - t0) / (t1 - t0)) if t1 > t0 else 1.0
                return {k: p0.get(k, 0.0) + (p1.get(k, 0.0) - p0.get(k, 0.0)) * u for k in self.params}
        return {k: keys[-1][2].get(k, 0.0) for k in self.params}


def wave(t, period, phase=0.0, harmonic=1):
    return math.sin(2 * math.pi * (harmonic * t / period + phase))


def lagged(fn, t, lag_ms, period=None):
    """``fn`` evaluated ``lag_ms`` late; wraps inside a loop period, holds the first value before 0."""
    tt = t - lag_ms
    return fn(tt % period if period else max(0.0, tt))


def damped(t, t0, amp, period_ms, decay_ms):
    """A decaying oscillation starting at t0 (overshoot/whip primitive)."""
    if t < t0:
        return 0.0
    x = t - t0
    return amp * math.exp(-x / decay_ms) * math.sin(2 * math.pi * x / period_ms)


# -- idle loop ------------------------------------------------------------------------------------------------

IDLE_DEFAULTS = {
    "duration_ms": 3000,
    "breath_period_ms": 1500,
    "breath_amount": 0.95,           # pass 2: about the full approved breath_in at peak
    "weight_shift_m": 0.014,
    "weight_shift_roll_deg": 3.2,
    "body_bob_m": 0.005,
    "look_yaw_deg": -34.0,          # toward the creature's right, which faces the side camera
    "look_pitch_deg": 9.0,
    "look_back_yaw_deg": 12.0,
    "ear_flick_ms": 1750,
    "ear_flick_deg": 48.0,
    "ear_alert_deg": -6.0,          # ears carried slightly forward and up: alert
    "tail_sway_deg": 3.0,
    "tail_sway_growth_deg": 2.4,    # added per joint down the chain
    "tail_lag_ms": 95.0,
    "tail_lift_deg": 2.0,
    "head_alert_deg": 3.0,
    # B-378v plume bones (tail_07..tail_09): a little sway lagging behind the tail; tail_01..06 unchanged
    "plume_sway_deg": 2.5,          # yaw per plume joint (relative), so the tip moves about 7.5 deg
    "plume_lift_deg": 1.2,          # sagittal per plume joint
    "plume_lag_ms": 110.0,          # extra lag per plume joint after tail_06
}


def make_idle(params=None):
    P = dict(IDLE_DEFAULTS, **(params or {}))
    T = float(P["duration_ms"])
    ly, lp, lb = P["look_yaw_deg"], P["look_pitch_deg"], P["look_back_yaw_deg"]
    look = Track([
        (0, "linear", {}),
        (350, "smooth", {}),
        (850, "smooth", {"yaw": ly, "pitch": lp}),
        (1450, "smooth", {"yaw": ly * 0.92, "pitch": lp * 0.6}),
        (2150, "smooth", {"yaw": lb, "pitch": -1.0}),
        (2650, "smooth", {"yaw": lb * 0.4}),
        (T, "smooth", {}),
    ])
    t0 = P["ear_flick_ms"]
    flick = Track([
        (0, "linear", {}), (t0, "linear", {}),
        (t0 + 70, "out", {"a": 1.0}),
        (t0 + 200, "smooth", {"a": 0.8}),
        (t0 + 270, "smooth", {"a": 0.25}),
        (t0 + 330, "out", {"a": 0.7}),
        (t0 + 520, "smooth", {"a": 0.0}),
        (T, "linear", {}),
    ])

    def tail_at(t):
        return {"yaw": wave(t, T), "lift": wave(t, T, 0.25, 2)}

    def fn(t):
        b = 0.5 - 0.5 * math.cos(2 * math.pi * t / P["breath_period_ms"])
        s = wave(t, T, 0.05)
        lk = look(t)
        fa = flick(t)["a"]
        tail = []
        for i in range(6):
            tv = lagged(tail_at, t, P["tail_lag_ms"] * (i + 1), T)
            amp = P["tail_sway_deg"] + P["tail_sway_growth_deg"] * i
            tail.append((P["tail_lift_deg"] * tv["lift"] * (0.5 + 0.2 * i), amp * tv["yaw"]))
        for k in range(3):   # plume bones: the same sway, later still (wraps inside the loop, so the seam holds)
            tv = lagged(tail_at, t, P["tail_lag_ms"] * 6 + P["plume_lag_ms"] * (k + 1), T)
            tail.append((P["plume_lift_deg"] * tv["lift"], P["plume_sway_deg"] * tv["yaw"]))
        alert = P["ear_alert_deg"]
        return {
            "body": (0.0, P["body_bob_m"] * (b - 0.5), 0.3 * s, P["weight_shift_roll_deg"] * s, 0.0, P["weight_shift_m"] * s),
            "breath": P["breath_amount"] * b,
            "bend": -0.4 * (b - 0.5),
            "neck": (0.0, P["head_alert_deg"] * 0.5 + 0.35 * lk["pitch"]),
            "head": P["head_alert_deg"] * 0.5 + 0.65 * lk["pitch"] - 0.6 * (b - 0.5),
            "neck_yaw": 0.4 * lk["yaw"], "head_yaw": 0.6 * lk["yaw"],
            "ears": {"r": (alert - 0.45 * P["ear_flick_deg"] * fa, P["ear_flick_deg"] * fa),
                     "l": (alert - 0.12 * P["ear_flick_deg"] * fa, 0.25 * P["ear_flick_deg"] * fa)},
            "tail": tail,
            "legs": {leg: {"plant": 1.0} for leg in LEGS},
        }

    return P, fn, []


# -- the lunge archetype and the signature ------------------------------------------------------------------

# Leg FK poses (local rotations about the joint's own +X, degrees), from the approved rig review poses.
HIND_STREAM = (94.5, -54.4, 51.6)    # blockout pose_leap: hind legs extended back
FORE_TUCK = (62.0, -112.0, 78.0)     # forelegs folded back under the chest (tighter than the blockout leap pose)
HIND_GATHER = (-43.0, -5.7, -22.9)   # blockout pose_landing: hind legs swung forward under the body
FORE_REACH = (-28.0, 22.0, -12.0)    # forelegs reaching down and forward to land

SIG_DEFAULTS = {
    # timing (ms)
    "duration_ms": 2000,
    "crouch_ms": 270,             # anticipation: rest to the deepest crouch
    "push_ms": 95,                # explosive hind-leg extension; takeoff at crouch + push
    "rise_ms": 360,               # takeoff to apex (decelerating, ballistic)
    "apex_hang_ms": 100,          # near-still hang at the top
    "pitch_over_ms": 140,         # nose-over into the dive, overlapping the end of the hang
    "descent_ms": 140,            # dive to the hit (accelerating, straight line)
    "hold_ms": 67,                # hit-stop: horns pinned at the contact point (hit frame plus 2)
    "rebound_peak_ms": 50,        # end of hold to the top of the rebound
    "pin_release_ms": 110,        # the horn pin fades over this after the hit-stop (no snap into the rebound)
    "rebound_ms": 300,            # hit to the fore feet touching down (pass 2: +67 ms so the fall has time)
    "hind_land_lag_ms": 70,       # hind feet touch down after the fore feet
    "settle_ms": 430,             # landing to recover
    # distances (m) and angles (deg)
    "crouch_depth_m": 0.125,
    "crouch_back_m": 0.035,
    "crouch_pitch_deg": 9.0,      # rear lower than the chest: loaded on the hind legs
    "crouch_head_deg": -26.0,     # head dropping, horns leveling
    "launch_pitch_deg": 24.0,
    "launch_height_m": 1.20,      # body center rise at the apex above rest
    "rise_travel_m": 0.50,        # forward travel takeoff to apex
    "hang_travel_m": 0.12,
    "apex_pitch_deg": -6.0,
    "dive_pitch_deg": 42.0,       # body nose-down during the descent, aligned with the dive path
    "dive_neck_deg": (-40.0, -36.0),  # pass 2: neck extended forward in line with the spine
    "dive_head_deg": -36.0,       # head pitched so the horn curve leads (same total head angle as pass 1)
    "hit_center_height_m": 0.90,  # body center height at the hit; pose_rig solves it from hit_contact_height_m
    "hit_contact_height_m": 0.40, # where the leading horn surface meets the target
    "impact_neck_deg": 28.0,      # neck and shoulder compression at the hit
    "impact_bend_deg": 7.0,       # spine hunch at the hit
    "impact_squash": 1.0,         # body squash at the hit (1 = 12 percent shorter, 6 percent thicker per spine joint)
    "fore_crouch_elbow_tuck": 0.6,  # B-bafy: 0..1 turns the planted forelegs' fold plane toward the sagittal plane in
                                  # the crouch. With the FK-knee pole the planted elbow splayed 42 mm out in the deepest crouch, so the
                                  # back of the upper arm stood 30 to 45 mm proud of the chest wall: the bony ridge Nick circled (D-bzfr).
                                  # 0.6 halves the splay (elbow 0.086 -> 0.060 m out); 1.0 drives the elbow into the chest. Ramps in from
                                  # frame 0 to the crouch and out with the fore plant at takeoff, so the rest of the clip is unchanged.
    "leg_reach_window_m": 0.30,   # pass 1-2 only (height window; it fired inside two frames as the body fell). Unused.
    "fore_reach_ms": 150.0,       # B-378v pass 3: forelegs swing from tucked to reaching over this time ...
    "hind_reach_ms": 200.0,       # ... and the hind legs from trailing to gathered under the body over this time,
    "plant_blend_ms": 120.0,      # pass 3: hind feet blend onto their ground targets over this, smooth in and out, ending at foot_down
    "fore_plant_blend_ms": 80.0,  # pass 3: the same for the fore feet (a longer blend pulls them down while the body is still high)
    "reach_lead_ms": 60.0,        # ... each ending this long before its own foot_down (then the plant blend takes over)
    "recoil_m": 0.27,             # rebound back from the target
    "rebound_rise_m": 0.03,
    "land_pitch_deg": -9.0,
    "land_compress_m": 0.05,
    # tail (B-378v): phase keys, all body frame. s = how far each joint is straightened from its rest curl toward the
    # in-line angle (0 rest curl and upright plume, 1 one straight line); lift = whole-line angle added (up positive)
    "tail_joints": 9,             # tail_01..tail_06 plus the sprite-only plume bones tail_07..tail_09
    "tail_target_deg": 0.0,       # the in-line angle: straight back in the body frame (between croup -21 and trunk +12)
    "tail_lag_ms": 30.0,          # lift lag per joint down the chain (pass 2: 38 over 6 joints)
    "tail_straighten_lag_ms": 14.0,  # straightening lag per joint (short, so the plume is straight by the apex)
    "tail_inertia": 0.1,         # share of a body pitch change the tail resists, per joint lag
    "tail_inertia_lag_cap": 6,    # inertia lag stops growing past this joint (the plume does not add more)
    "tail_crouch_s": 0.25,        # crouch: the curl relaxes a little as the tail lowers and loads
    "tail_crouch_lift_deg": -12.0,
    "tail_crouch_swish_deg": 2.2, # crouch: small side swish, yaw per joint at the envelope peak
    "tail_crouch_swish_ms": 300.0,  # swish period
    "tail_launch_lift_deg": -14.0,
    "tail_straighten_ms": 130.0,  # takeoff to the streaming lift (the launch sweep-down ends)
    "tail_uncurl_end_ms": 200.0,  # pass 2: takeoff to fully straight; one smooth uncurl from the crouch to here
    "tail_stream_lift_deg": 0.0,  # rise and apex: the line in flight
    "tail_stream_arc_deg": 1.0,   # rise to hit: added per joint down the chain, a slight upward arc
    "tail_dive_counter_deg": 2.0,  # dive: the straight tail swings up as a counterweight to the nose-down pitch
    "tail_counter_ms": 110.0,     # pitch-over start to full counterweight
    "tail_dive_arc_deg": 0.0,     # dive: the arc flattens so the line stays nearly straight
    "tail_plume_tip_trim_deg": -8.0,  # when straight, tail_09 (and half on tail_08) tips down to cancel the plume's
                                  # own forward curl between the joints, so the plume tip points back along the line
    "tail_whip_deg": 55.0,
    "tail_whip_period_ms": 180.0,
    "tail_whip_decay_ms": 160.0,
    "tail_whip_max_factor": 1.1,  # whip amplitude grows 0.12 per joint down the chain up to this factor
    "tail_whip_up_scale": 0.35,   # pass 2: share kept of the whip's upward swings (downward swings in full)
    "tail_land_s": 0.5,          # fore feet down: the tail has dropped and starts to curl back
    "tail_land_lift_deg": -20.0,
    "tail_settle_s": 0.2,         # hind feet down + 80 ms
    "ears_back_deg": 55.0,
}


def sig_times(P):
    t = {}
    t["crouch"] = P["crouch_ms"]
    t["takeoff"] = t["crouch"] + P["push_ms"]
    t["fore_off"] = t["crouch"] + 0.35 * P["push_ms"]
    t["apex"] = t["takeoff"] + P["rise_ms"]
    t["dive"] = t["apex"] + P["apex_hang_ms"]
    t["pitch0"] = t["dive"] - P["pitch_over_ms"] * 0.8
    t["hit"] = t["dive"] + P["descent_ms"]
    t["impact"] = t["hit"] + P["hold_ms"]
    t["peak"] = t["impact"] + P["rebound_peak_ms"]
    t["fore_land"] = t["hit"] + P["rebound_ms"]
    t["hind_land"] = t["fore_land"] + P["hind_land_lag_ms"]
    t["recover"] = t["hind_land"] + P["settle_ms"]
    t["end"] = P["duration_ms"]
    return t


def frame_ms(ms):
    """Snap a time to the nearest frame (events land on frames)."""
    return round(ms * FPS / 1000) * 1000.0 / FPS


def make_sig(params=None, rest_center_z=0.48):
    """sig.horns-first-descent: the lunge archetype (launch, hit, recover) with the leap and dive as extra keys.

    Returns (params, fn, events, travel). ``fn(t)`` is in place; ``travel`` declares the root path the game
    applies linearly between startMs and endMs (the review render applies the same).
    """
    P = dict(SIG_DEFAULTS, **(params or {}))
    for k in ("dive_neck_deg",):
        P[k] = tuple(P[k])
    T = sig_times(P)
    for k in ("takeoff", "hit", "fore_land", "hind_land"):
        T[k] = frame_ms(T[k])
    dive = math.radians(P["dive_pitch_deg"])
    z_apex = P["launch_height_m"]
    f_apex = P["crouch_back_m"] * 0 + P["rise_travel_m"]
    f_dive = f_apex + P["hang_travel_m"]
    z_dive = z_apex + 0.02
    # hit center along the dive line from the dive start
    z_hit = P["hit_center_height_m"] - rest_center_z
    run = (z_dive - z_hit) / math.tan(dive)
    f_hit = f_dive + run
    f_land = f_hit - P["recoil_m"]
    travel = f_land            # body center ends over the root, so the root covers takeoff..hit = f_land
    # world body path (center offset from rest), eased per segment
    path = Track([
        (0, "linear", {}),
        (T["crouch"], "smooth", {"f": -P["crouch_back_m"], "z": -P["crouch_depth_m"]}),
        (T["takeoff"], "in", {"f": 0.12, "z": 0.10}),
        (T["apex"], "out", {"f": f_apex, "z": z_apex}),
        (T["dive"], "smooth", {"f": f_dive, "z": z_dive}),
        (T["hit"], "in", {"f": f_hit, "z": z_hit}),
        (T["impact"], "linear", {"f": f_hit, "z": z_hit}),       # hit-stop (the horn pin adds the squash)
        (T["peak"], "out", {"f": f_hit - 0.45 * P["recoil_m"], "z": z_hit + P["rebound_rise_m"]}),
        (T["fore_land"], "in", {"f": f_land - 0.01, "z": 0.015}),
        (T["hind_land"] + 60, "out", {"f": f_land, "z": -P["land_compress_m"]}),
        (T["recover"], "smooth", {"f": f_land, "z": 0.006}),
        (T["end"], "smooth", {"f": f_land}),
    ])
    pitch = Track([
        (0, "linear", {}),
        (T["crouch"], "smooth", {"p": P["crouch_pitch_deg"]}),
        (T["takeoff"], "in", {"p": P["launch_pitch_deg"]}),
        (T["apex"] - 40, "smooth", {"p": P["apex_pitch_deg"]}),
        (T["pitch0"], "smooth", {"p": P["apex_pitch_deg"] - 6}),
        (T["dive"] + 10, "smooth", {"p": -P["dive_pitch_deg"]}),
        (T["hit"], "linear", {"p": -P["dive_pitch_deg"]}),
        (T["impact"], "linear", {"p": -P["dive_pitch_deg"] + 2}),
        (T["peak"], "out", {"p": -P["dive_pitch_deg"] + 14}),
        (T["fore_land"] - 60, "smooth", {"p": P["land_pitch_deg"] + 4}),
        (T["fore_land"], "smooth", {"p": P["land_pitch_deg"]}),
        (T["hind_land"] + 80, "smooth", {"p": 1.5}),
        (T["recover"], "smooth", {"p": 0.0}),
        (T["end"], "smooth", {}),
    ])
    nk1, nk2 = P["dive_neck_deg"]
    upper = Track([
        (0, "linear", {}),
        (T["crouch"], "smooth", {"n1": -4, "n2": -12, "h": P["crouch_head_deg"], "bend": 2.0, "ear": 25}),
        (T["takeoff"], "in", {"n1": -6, "n2": -16, "h": P["crouch_head_deg"] * 0.7, "bend": -3.0, "ear": 45, "jaw": 0}),
        (T["apex"] - 40, "smooth", {"n1": -8, "n2": -22, "h": -30, "bend": -2.5, "ear": P["ears_back_deg"]}),
        (T["dive"], "smooth", {"n1": nk1, "n2": nk2, "h": P["dive_head_deg"], "bend": 0.0, "ear": P["ears_back_deg"]}),
        (T["hit"], "linear", {"n1": nk1, "n2": nk2, "h": P["dive_head_deg"], "ear": P["ears_back_deg"]}),
        (T["hit"] + 45, "out", {"n1": nk1 + P["impact_neck_deg"], "n2": nk2 - P["impact_neck_deg"],
                                "h": P["dive_head_deg"], "bend": P["impact_bend_deg"], "sq": P["impact_squash"],
                                "ear": P["ears_back_deg"] + 15, "jaw": 5}),
        (T["impact"], "smooth", {"n1": nk1 + 0.8 * P["impact_neck_deg"], "n2": nk2 - 0.8 * P["impact_neck_deg"],
                                 "h": P["dive_head_deg"], "bend": 0.8 * P["impact_bend_deg"], "sq": 0.7 * P["impact_squash"],
                                 "ear": P["ears_back_deg"] + 15, "jaw": 4}),
        (T["impact"] + P["pin_release_ms"] + 20, "smooth", {"n1": -10, "n2": -12, "h": -24, "bend": 2.0, "sq": 0.0, "ear": 40}),
        (T["fore_land"], "smooth", {"n1": -4, "n2": -6, "h": -14, "bend": 1.5, "ear": 30}),
        (T["hind_land"] + 80, "smooth", {"n1": 2, "n2": -4, "h": -8, "bend": 3.0, "ear": 20}),
        (T["recover"], "smooth", {"n1": 0.5, "n2": 0.5, "h": 1.0, "ear": 4}),
        (T["end"], "smooth", {}),
    ])
    # tail by phase (B-378v). s: 0 rest curl, 1 one straight line at tail_target_deg; lift: whole line up; arc: per joint
    straight = T["takeoff"] + P["tail_straighten_ms"]
    counter = min(T["pitch0"] + P["tail_counter_ms"], T["hit"] - 20)
    tails = Track([
        (0, "linear", {}),
        (T["crouch"], "smooth", {"lift": P["tail_crouch_lift_deg"]}),
        (T["takeoff"], "smooth", {"lift": P["tail_launch_lift_deg"]}),
        (straight, "smooth", {"lift": P["tail_stream_lift_deg"], "arc": P["tail_stream_arc_deg"]}),
        (T["pitch0"], "linear", {"lift": P["tail_stream_lift_deg"], "arc": P["tail_stream_arc_deg"]}),
        (counter, "smooth", {"lift": P["tail_dive_counter_deg"], "arc": P["tail_dive_arc_deg"]}),
        (T["hit"], "linear", {"lift": P["tail_dive_counter_deg"], "arc": P["tail_dive_arc_deg"]}),
        (T["fore_land"], "smooth", {"lift": P["tail_land_lift_deg"]}),
        (T["hind_land"] + 80, "smooth", {"lift": -2.0}),
        (T["recover"], "smooth", {"lift": 0.0}),
        (T["end"], "smooth", {}),
    ])
    # pass 2: the uncurl is its own track, one smooth ramp from the crouch to fully straight (no takeoff key), so the
    # plume unrolls monotonically instead of jumping through the short crouch-to-takeoff segment
    uncurl = Track([
        (0, "linear", {}),
        (T["crouch"], "smooth", {"s": P["tail_crouch_s"]}),
        (T["takeoff"] + P["tail_uncurl_end_ms"], "smooth", {"s": 1.0}),
        (T["hit"], "linear", {"s": 1.0}),
        (T["fore_land"], "smooth", {"s": P["tail_land_s"]}),
        (T["hind_land"] + 80, "smooth", {"s": P["tail_settle_s"]}),
        (T["recover"], "smooth", {"s": 0.0}),
        (T["end"], "smooth", {}),
    ])
    sw0, sw1 = T["crouch"] * 0.35, T["takeoff"] + 60   # crouch swish envelope

    def swish(t):
        if t <= sw0 or t >= sw1:
            return 0.0
        env = math.sin(math.pi * (t - sw0) / (sw1 - sw0)) ** 2
        return P["tail_crouch_swish_deg"] * env * math.sin(2 * math.pi * (t - sw0) / P["tail_crouch_swish_ms"])

    def pitch_at(t):
        return pitch(t)["p"]

    def root_at(t):
        u = clamp01((t - T["takeoff"]) / (T["hit"] - T["takeoff"]))
        return travel * u

    z_rest_land = 0.015

    def reach_w(t, land, hind=False):
        """Pass 3: time-based. 0 (tucked or trailing) until reach_ms + reach_lead_ms before this leg's foot_down, then a
        smooth swing to 1 (reaching or gathered) that ends reach_lead_ms before it; never before the hit-stop ends.
        (Passes 1-2 used a body-height window, which the falling body crossed in about two frames: a pose pop.)"""
        if t < T["impact"]:
            return 0.0
        dur = P["hind_reach_ms"] if hind else P["fore_reach_ms"]
        end = land - P["reach_lead_ms"]
        return ease("smooth", (t - (end - dur)) / dur)

    # leg schedule: fk pose, plant weight, heel roll
    def leg_spec(t, leg):
        hind = leg[0] == "h"
        if hind:
            roll = 30.0 * ease("in", (t - T["crouch"]) / (T["takeoff"] - T["crouch"])) if t <= T["takeoff"] else 30.0
            if t <= T["takeoff"]:
                return {"plant": 1.0, "roll": roll if t > T["crouch"] else 0.0, "fk": (0, 0, 0)}
            land = T["hind_land"]
            if t < T["impact"]:
                u = ease("smooth", (t - T["takeoff"]) / 140.0)
                fk = tuple(a * u for a in HIND_STREAM)
                return {"plant": max(0.0, 1 - (t - T["takeoff"]) / 90.0), "roll": roll, "fk": fk}
            if t < land:
                u = reach_w(t, land, hind=True)
                fk = tuple(a + (b - a) * u for a, b in zip(HIND_STREAM, HIND_GATHER))
                w = ease("smooth", (t - (land - P["plant_blend_ms"])) / P["plant_blend_ms"])   # pass 3: smooth, was "in" over 90 ms (snapped into the plant)
                return {"plant": w, "roll": 0.0, "fk": fk}
            u = ease("smooth", (t - land) / 220.0)
            return {"plant": 1.0, "roll": 0.0, "fk": tuple(a * (1 - u) for a in HIND_GATHER)}
        fore_off = T["fore_off"]
        land = T["fore_land"]
        tuck = P["fore_crouch_elbow_tuck"] * ease("smooth", t / T["crouch"])   # B-bafy: elbows stay in line, not splayed
        if t <= fore_off:
            return {"plant": 1.0, "roll": 18.0 * ease("in", (t - T["crouch"]) / (fore_off - T["crouch"])) if t > T["crouch"] else 0.0, "fk": (0, 0, 0), "tuck": tuck}
        if t < T["impact"]:
            u = ease("out", (t - fore_off) / 150.0)
            fk = tuple(a * u for a in FORE_TUCK)
            w = max(0.0, 1 - (t - fore_off) / 60.0)
            return {"plant": w, "roll": 18.0, "fk": fk, "tuck": tuck * w}
        if t < land:
            u = reach_w(t, land)
            fk = tuple(a + (b - a) * u for a, b in zip(FORE_TUCK, FORE_REACH))
            w = ease("smooth", (t - (land - P["fore_plant_blend_ms"])) / P["fore_plant_blend_ms"])   # pass 3: smooth, was "in" over 80 ms
            return {"plant": w, "roll": 0.0, "fk": fk}
        u = ease("smooth", (t - land) / 220.0)
        return {"plant": 1.0, "roll": 0.0, "fk": tuple(a * (1 - u) for a in FORE_REACH)}

    def tail_at(t):
        return tails(t)

    def pin_w(t):
        """Horn pin weight: 1 through the hit-stop (horns held at the contact point), then fading out."""
        if t < T["hit"] - 1:
            return 0.0
        if t <= T["impact"] + 1:
            return 1.0
        return 1.0 - ease("smooth", (t - T["impact"]) / P["pin_release_ms"])

    def fn(t):
        pa = path(t)
        up = upper(t)
        p = pitch_at(t)
        tail = []
        for i in range(int(P["tail_joints"])):
            lag = P["tail_lag_ms"] * (i + 1)
            tv = lagged(tail_at, t, lag)
            sv = lagged(uncurl, t, P["tail_straighten_lag_ms"] * (i + 1))["s"]
            # the tail keeps its old world angle for a moment when the body pitches (lag down the chain)
            ilag = P["tail_lag_ms"] * (min(i, int(P["tail_inertia_lag_cap"]) - 1) + 1)
            inertia = P["tail_inertia"] * (pitch_at(max(0.0, t - ilag)) - p)
            whip = damped(t, T["hit"] + 0.45 * lag, P["tail_whip_deg"] * min(0.5 + 0.12 * i, P["tail_whip_max_factor"]), P["tail_whip_period_ms"], P["tail_whip_decay_ms"])
            if whip > 0:
                whip *= P["tail_whip_up_scale"]   # pass 2: the upward swings are damped, the downward ones are not
            landing = damped(t, T["fore_land"] + lag, -9.0 * (0.4 + 0.12 * min(i, 5)), 260.0, 180.0)
            trim = P["tail_plume_tip_trim_deg"] * sv * {7: 0.5, 8: 1.0}.get(i, 0.0)
            tail.append({"s": sv, "lift": tv["lift"] + tv.get("arc", 0.0) * i + inertia + whip + landing + trim, "yaw": swish(t - lag)})
        ears_back = up.get("ear", 0.0)
        return {
            "body": (pa["f"] - root_at(t), pa["z"], p, 0.0, 0.0, 0.0),
            "bend": up.get("bend", 0.0),
            "squash": up.get("sq", 0.0),
            "pin": pin_w(t),
            "neck": (up.get("n1", 0.0), up.get("n2", 0.0)),
            "head": up.get("h", 0.0),
            "jaw": up.get("jaw", 0.0),
            "ears": {"l": (ears_back, -0.25 * ears_back), "r": (ears_back, -0.25 * ears_back)},
            "tail_mode": "straighten",
            "tail_target_deg": P["tail_target_deg"],
            "tail": tail,
            "legs": {leg: leg_spec(t, leg) for leg in LEGS},
            "_world_body": (pa["f"], pa["z"]),
            "_root": root_at(t),
        }

    events = [("launch", T["takeoff"]), ("hit", T["hit"]), ("foot_down", T["fore_land"]), ("foot_down", T["hind_land"])]
    trav = {"distanceM": travel, "startMs": T["takeoff"], "endMs": T["hit"]}
    return P, fn, events, trav, T
