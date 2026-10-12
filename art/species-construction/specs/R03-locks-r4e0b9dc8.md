# R03 spec: ear fan front

Region R03, written 2026-10-01 against baseline packet `assembled-0291` (head `head-0281`, body `body-0288`; the fan geometry itself is unchanged since `head-0223`). Governing reference: the first sheet `evidence/identity-run-0001.png` (m01), front and left figures. Idiom reference for the lock masses and the inner tuft: `evidence/head-clay-study-0021.png` (r04). Gap audit rows closed here (`gap-audit-0226.md`): rank 4 (fan front construction) and rank 19 (fan sides in profile), plus the critic's R03 issues on assembled-0291 (no pointed locks, no pale tuft, blunt tips). Annotated image: `specs/R03.png`.

## Coordinates

Loop fit units from `loop_tools.py canonical()`: `y` down from the top of the figure (0 at the top, 1 at the floor), `x` across in figure heights, positive to the viewer's right in the front view. **Every coordinate in the tables is in the model frame: the model head is symmetric about x 0, so its face center and fan center coincide.** The sheet's fan center and face center do not: its face center sits at x -.013 in the fan-centered fit frame. So:

- Silhouette points (outline, lock tips on the edge) were read from the sheet in its fan-centered frame and are used as they are, because the model's fan already matches the sheet's fan outline (span .991, front head band missing .052).
- Cup and tuft points were read relative to the sheet's face center and carried to the model's face center (sheet x + .013 on both sides). Panel A of `R03.png` draws them back on the sheet with that shift.
- `L` is the character's left (front +x, the higher ear on the sheet); `R` is the character's right (front -x). The sheet's fan is tilted, with the R ear about .015 to .020 lower, so the two sides have their own rows. `u` means |x| in the model frame.
- Depth `df` = world y / 1.8605, positive toward the rear (front is -y). In the left (profile) fit frame, x_side = df + .011 on this assembly (R01 spec).

Conversions (head transform scale .5, translation (0, -.02, .635), unchanged in assembled-0291): world x = 1.8605 x; world z = -.957 + 1.8605 (1 - y). Head-local x = 3.721 x, head-local z = .537 - 3.721 y, head-local y (Blender, front is -y) = 3.721 df + .04. Widths, lengths and thicknesses in head-local units are 3.721 times the figure values. Examples: L pivot (.100, .128, df -.026) is head-local (.372, -.057, .061); L cup upper tip (.199, .043, df .020) is (.740, .114, .377); L tip lock point (.276, .033, df .010) is (1.027, .077, .414).

## 1. Target outline

Traced with Python from the first sheet (`reference_figure('front')`, `fill_small_holes`, the `canonical()` frame, sampled at .0005 to .001 per pixel). Model values are from `assembled-0291/render/front.png` in the same frame.

**Front fan edge, per column (top = highest filled row; bottom = lowest filled row above y .235).**

| x | sheet top | model top | sheet bottom | model bottom |
|---|---|---|---|---|
| -0.26 | 0.044 | 0.047 | 0.091 | 0.090 |
| -0.24 | 0.036 | 0.028 | 0.112 | 0.111 |
| -0.22 | 0.027 | 0.023 | 0.134 | 0.134 |
| -0.20 | 0.027 | 0.027 | 0.150 | 0.147 |
| -0.18 | 0.027 | 0.036 | 0.163 | 0.154 |
| -0.16 | 0.025 | 0.024 | 0.174 | 0.157 |
| -0.14 | 0.028 | 0.037 | 0.176 | 0.163 |
| -0.12 | 0.027 | 0.030 | 0.177 | 0.171 |
| -0.10 | 0.033 | 0.027 | 0.174 | 0.174 |
| -0.08 | 0.031 | 0.028 | 0.199 | 0.184 |
| -0.06 | 0.031 | 0.034 | 0.214 | 0.206 |
| -0.04 | 0.022 | 0.021 | 0.225 | 0.219 |
| -0.02 | 0.017 | 0.014 | 0.235 | 0.235 |
| 0.00 | 0.019 | 0.013 | 0.235 | 0.235 |
| +0.02 | 0.025 | 0.014 | 0.226 | 0.235 |
| +0.04 | 0.025 | 0.018 | 0.209 | 0.217 |
| +0.06 | 0.019 | 0.026 | 0.190 | 0.204 |
| +0.08 | 0.014 | 0.018 | 0.177 | 0.184 |
| +0.10 | 0.011 | 0.011 | 0.182 | 0.174 |
| +0.12 | 0.006 | 0.011 | 0.169 | 0.171 |
| +0.14 | 0.008 | 0.008 | 0.161 | 0.161 |
| +0.16 | 0.003 | 0.003 | 0.158 | 0.154 |
| +0.18 | 0.003 | 0.007 | 0.149 | 0.143 |
| +0.20 | 0.001 | 0.003 | 0.128 | 0.124 |
| +0.22 | 0.006 | 0.000 | 0.107 | 0.110 |
| +0.24 | 0.009 | 0.003 | 0.093 | 0.087 |
| +0.26 | 0.020 | 0.016 | 0.077 | 0.052 |

The envelope already fits within about .01 everywhere except at the two tips and along the R lower edge from x -.18 to -.12, where the model sits .009 to .017 too high (the R P8, P9 and F8 rows bring it down to the table; the predicted bottom at x -.14 is .174). What fails is the shape at the tips and the construction of the edge.

**Tips (R03.3).** On the sheet each tip narrows to a point. At L the column heights are .055 (x .25, rows .017 to .072), .057 (x .26, .020 to .077) and .028 (x .27, .028 to .056), ending at the point (.276, .033). At R they are .046 (x -.25, .039 to .085), .047 (x -.26, .044 to .091), and nothing past the point (-.273, .057) except a second point at (-.268, .080). The model ends in a flat vertical edge: L spans x .256 to .262 from y .01 to .05, and R spans x -.262 to -.263 from y .05 to .08. That is the "blunt square end". The point rises about 25 degrees above the wing's midline (L midline at x .25 is y .045; the point is at .033), which is the up flare. No column within .008 of a tip point may be taller than .035, and no vertical run of the outline at a tip may be longer than .010.

**V tilt (R03.3).** On the sheet the L wing's top edge peaks at y .001 to .003 (x .16 to .20) and falls to .019 at x .06 and .025 at x .02 to .04, the cleft beside the crown tuft. The R wing's top is nearly level at .023 to .028 from x -.12 to -.22. The crown tuft tips reach y .014 to .019. So the V is .022 to .024 deep on the L side measured to the cleft, and close to zero on the R side. The model's envelope already has this (L .003 at x .16, .018 to .014 at x .02 to .04). It does not read because the top band is a rolled lip (section 4). Keep the top edge to the table within .005, and let the L primaries P2 to P4 carry the rise.

**Serrated edge.** An opening test on the outline (disk radius .010, protrusions at least .006 deep, along the top, tip and lower edges, |x| above .06 and y above .2 excluded) finds 17 points on L and 14 on R on the sheet, .006 to .015 deep, about .035 apart. The model has 1 on L and 2 on R. Target: 10 to 17 per side, .006 to .018 deep.

**Cup outline (front, model frame).** The inner ear is a leaf-shaped hollow: its inner edge on the skull side, its pointed upper tip toward the upper outer corner, and its lateral side open toward the wing. It was traced from the pale tuft plus the dark hollow around it (gray at least 140 is tuft, gray below 88 within .025 of the tuft is hollow; sheet fur reads about 99, tuft about 180, eye white 234). Polygon, clockwise from the inner top:

- L: (.100, .066) (.113, .062) (.146, .053) (.185, .041) (.199, .043) upper tip; lateral (.194, .071) (.173, .097); lower rim (.155, .111) (.141, .134) (.125, .147) (.104, .170); inner bottom (.100, .168). Area .0067.
- R: (-.100, .087) (-.113, .084) (-.147, .070) (-.179, .061) (-.186, .063) upper tip; lateral (-.185, .090) (-.173, .113); lower rim (-.161, .130) (-.144, .146) (-.107, .171); inner bottom (-.100, .166). Area .0058.

On the sheet the inner edge sits at u .080 to .087. The model's skull side line, where its front surface falls behind df -.04, is at u .100 for every row from .09 to .17, and the model eyes reach u .082. So the inner edge goes on u .100 and the cup is about .015 narrower than the sheet's (see friction 1).

**Pale tuft outline (sheet, measured).** L (sheet frame): it rises from a base on the skull side, (.085, .084) to (.087, .147), to its pointed tip at (.163, .053). Its upper edge is a clean line from (.089, .082) to the tip. Its lower outer edge is serrated by four lock tips at (.158, .089), (.145, .095), (.137, .112) and (.124, .127). Area .0036. R: base (-.111, .097) to (-.114, .147), tip (-.175, .072), area .0027. Measured over the traced cup, the sheet's pale tuft covers .41 (L) and .37 (R) at the 140 threshold, and .45 and .48 at 120. The soft pale strands at its edge are what the gestalt reader sees as "at least half".

**Profile (left view).** The pale tuft is clearly visible in the sheet's profile: x_side -.02 to +.03, y .06 to .15, area .0029, a leaf pointed at the top and rooted just behind the eye. Row extents: .07 (.003 to .019), .09 (-.017 to .032), .11 (-.013 to .032), .13 (-.002 to .026), .15 (.003 to .014). The model shows no inner cup from the side: the wing's front surface at u .16 to .24 lies at df -.033 to -.001, in front of where the cup sits, so it hides the cup (gap audit rank 19).

## 2. Structure

Counted in the first sheet's front view, with r04 for the idiom. Each side has 10 primary edge locks (P1 to P10; P1 to P8 are the large locks the rubric counts, and P9 and P10 are short drape locks under the cup at the cheek). It has 9 fill locks (F1 to F9) set behind the primaries in the notches between them, 5 cup-rim locks (M1 to M5) lying over the primaries' roots along the cup's upper and lateral rim, and 5 pale tuft locks (T1 to T5) inside the cup. That is 24 coat locks plus 5 tuft locks per side. Every lock radiates from the ear root: the coat locks from the pivot (L (.100, .128), R (-.104, .136)), leaning toward the ear's main axis (the pivot-to-tip line) by up to 45 percent of the angle between them, and the tuft locks from the skull side line. The primary tips are measured outline points, plus the two tip points and the top-edge points. Fill tips sit at the midpoints between primary tips, except F4 and F5 on each side, which take the measured tip-region points.

Columns: root and tip are (x, y); length and widths are figure units; width is the full width at the root and at the widest point, about 40 percent of the way out; thickness is front to back at the widest point; direction is degrees in the front view (0 points out, away from the face; 90 points up; negative points down); depth is the front-surface df at the root and at the tip. Lock shape in front view: the width rises from the root width to the widest at t .4 (t = distance from the root over the length), then falls as (1 - (t - .4)/.6)^1.4 to a sharp point. This is the profile the coverage check below used.

**Character's left (L, front +x).**

| Lock | Root (x, y) | Tip (x, y) | Length | Width root / mid | Thick | Dir | Depth root / tip |
|---|---|---|---|---|---|---|---|
| LP1 | (+0.056, 0.064) | (+0.075, 0.015) | 0.053 | 0.022 / 0.032 | 0.013 | 69 | -0.040 / -0.040 |
| LP2 | (+0.094, 0.056) | (+0.125, 0.005) | 0.060 | 0.024 / 0.036 | 0.014 | 59 | -0.040 / -0.032 |
| LP3 | (+0.132, 0.052) | (+0.175, 0.002) | 0.066 | 0.026 / 0.038 | 0.015 | 49 | -0.029 / -0.003 |
| LP4 | (+0.185, 0.039) | (+0.222, 0.006) | 0.050 | 0.022 / 0.030 | 0.012 | 42 | +0.004 / +0.014 |
| LP5 | (+0.201, 0.073) | (+0.276, 0.033) | 0.085 | 0.028 / 0.042 | 0.017 | 28 | +0.012 / +0.010 |
| LP6 | (+0.192, 0.100) | (+0.260, 0.076) | 0.072 | 0.026 / 0.040 | 0.016 | 19 | +0.008 / +0.012 |
| LP7 | (+0.162, 0.129) | (+0.227, 0.116) | 0.066 | 0.024 / 0.036 | 0.014 | 11 | -0.013 / +0.015 |
| LP8 | (+0.136, 0.146) | (+0.196, 0.141) | 0.060 | 0.022 / 0.032 | 0.013 | 5 | -0.027 / +0.009 |
| LP9 | (+0.132, 0.144) | (+0.142, 0.171) | 0.029 | 0.014 / 0.018 | 0.007 | -70 | -0.029 / -0.024 |
| LP10 | (+0.113, 0.162) | (+0.104, 0.182) | 0.022 | 0.010 / 0.012 | 0.005 | -114 | -0.036 / -0.039 |
| LF1 | (+0.080, 0.050) | (+0.100, 0.010) | 0.045 | 0.016 / 0.024 | 0.010 | 63 | -0.036 / -0.036 |
| LF2 | (+0.123, 0.040) | (+0.150, 0.004) | 0.045 | 0.016 / 0.024 | 0.010 | 53 | -0.028 / -0.015 |
| LF3 | (+0.167, 0.036) | (+0.198, 0.004) | 0.045 | 0.016 / 0.024 | 0.010 | 46 | -0.005 / +0.014 |
| LF4 | (+0.217, 0.053) | (+0.262, 0.021) | 0.055 | 0.016 / 0.024 | 0.010 | 35 | +0.017 / +0.015 |
| LF5 | (+0.222, 0.074) | (+0.272, 0.052) | 0.055 | 0.016 / 0.024 | 0.010 | 24 | +0.018 / +0.014 |
| LF6 | (+0.200, 0.108) | (+0.244, 0.096) | 0.046 | 0.016 / 0.024 | 0.010 | 15 | +0.014 / +0.018 |
| LF7 | (+0.167, 0.135) | (+0.212, 0.128) | 0.046 | 0.016 / 0.024 | 0.010 | 9 | -0.005 / +0.016 |
| LF8 | (+0.124, 0.152) | (+0.169, 0.156) | 0.045 | 0.012 / 0.018 | 0.007 | -5 | -0.028 / -0.003 |
| LF9 | (+0.122, 0.153) | (+0.123, 0.176) | 0.023 | 0.010 / 0.014 | 0.006 | -88 | -0.029 / -0.028 |
| LM1 | (+0.120, 0.057) | (+0.140, 0.018) | 0.044 | 0.018 / 0.026 | 0.010 | 63 | -0.037 / -0.029 |
| LM2 | (+0.164, 0.044) | (+0.188, 0.008) | 0.043 | 0.018 / 0.026 | 0.010 | 56 | -0.015 / +0.003 |
| LM3 | (+0.200, 0.054) | (+0.239, 0.035) | 0.043 | 0.018 / 0.026 | 0.010 | 26 | +0.008 / +0.011 |
| LM4 | (+0.185, 0.087) | (+0.229, 0.083) | 0.044 | 0.018 / 0.026 | 0.010 | 5 | +0.006 / +0.012 |
| LM5 | (+0.164, 0.108) | (+0.208, 0.110) | 0.044 | 0.018 / 0.026 | 0.010 | -3 | -0.015 / +0.008 |
| LT1 | (+0.100, 0.088) | (+0.176, 0.053) | 0.084 | 0.022 / 0.038 | 0.014 | 25 | -0.038 / +0.007 |
| LT2 | (+0.100, 0.102) | (+0.173, 0.070) | 0.080 | 0.022 / 0.036 | 0.014 | 24 | -0.038 / +0.006 |
| LT3 | (+0.100, 0.116) | (+0.169, 0.090) | 0.074 | 0.020 / 0.034 | 0.014 | 21 | -0.038 / +0.004 |
| LT4 | (+0.100, 0.130) | (+0.151, 0.111) | 0.054 | 0.018 / 0.030 | 0.014 | 20 | -0.038 / -0.005 |
| LT5 | (+0.100, 0.146) | (+0.133, 0.130) | 0.037 | 0.012 / 0.020 | 0.012 | 26 | -0.038 / -0.014 |

**Character's right (R, front -x).**

| Lock | Root (x, y) | Tip (x, y) | Length | Width root / mid | Thick | Dir | Depth root / tip |
|---|---|---|---|---|---|---|---|
| RP1 | (-0.064, 0.079) | (-0.085, 0.031) | 0.052 | 0.022 / 0.032 | 0.013 | 66 | -0.040 / -0.040 |
| RP2 | (-0.100, 0.075) | (-0.135, 0.026) | 0.060 | 0.024 / 0.036 | 0.014 | 54 | -0.040 / -0.027 |
| RP3 | (-0.138, 0.071) | (-0.185, 0.025) | 0.066 | 0.026 / 0.038 | 0.015 | 44 | -0.026 / +0.004 |
| RP4 | (-0.187, 0.059) | (-0.228, 0.027) | 0.052 | 0.022 / 0.030 | 0.012 | 38 | +0.011 / +0.016 |
| RP5 | (-0.196, 0.093) | (-0.273, 0.057) | 0.085 | 0.028 / 0.042 | 0.017 | 25 | +0.012 / +0.010 |
| RP6 | (-0.191, 0.113) | (-0.260, 0.091) | 0.072 | 0.026 / 0.040 | 0.016 | 18 | +0.008 / +0.012 |
| RP7 | (-0.182, 0.129) | (-0.246, 0.114) | 0.066 | 0.024 / 0.036 | 0.014 | 13 | +0.002 / +0.014 |
| RP8 | (-0.151, 0.148) | (-0.211, 0.141) | 0.060 | 0.022 / 0.032 | 0.013 | 7 | -0.019 / +0.012 |
| RP9 | (-0.152, 0.145) | (-0.166, 0.180) | 0.038 | 0.014 / 0.018 | 0.007 | -68 | -0.018 / -0.010 |
| RP10 | (-0.120, 0.168) | (-0.124, 0.184) | 0.016 | 0.010 / 0.012 | 0.005 | -76 | -0.033 / -0.032 |
| RF1 | (-0.088, 0.068) | (-0.110, 0.028) | 0.046 | 0.016 / 0.024 | 0.010 | 61 | -0.036 / -0.033 |
| RF2 | (-0.131, 0.060) | (-0.160, 0.026) | 0.045 | 0.016 / 0.024 | 0.010 | 50 | -0.025 / -0.010 |
| RF3 | (-0.173, 0.056) | (-0.207, 0.026) | 0.045 | 0.016 / 0.024 | 0.010 | 41 | -0.000 / +0.015 |
| RF4 | (-0.215, 0.074) | (-0.262, 0.045) | 0.055 | 0.016 / 0.024 | 0.010 | 32 | +0.017 / +0.015 |
| RF5 | (-0.217, 0.098) | (-0.268, 0.078) | 0.055 | 0.016 / 0.024 | 0.010 | 21 | +0.017 / +0.014 |
| RF6 | (-0.210, 0.114) | (-0.253, 0.103) | 0.044 | 0.016 / 0.024 | 0.010 | 14 | +0.016 / +0.017 |
| RF7 | (-0.184, 0.135) | (-0.228, 0.128) | 0.045 | 0.016 / 0.024 | 0.010 | 9 | +0.008 / +0.020 |
| RF8 | (-0.144, 0.159) | (-0.188, 0.160) | 0.044 | 0.012 / 0.018 | 0.007 | -1 | -0.019 / +0.011 |
| RF9 | (-0.138, 0.156) | (-0.145, 0.182) | 0.027 | 0.010 / 0.014 | 0.006 | -75 | -0.022 / -0.018 |
| RM1 | (-0.117, 0.079) | (-0.139, 0.041) | 0.044 | 0.018 / 0.026 | 0.010 | 60 | -0.038 / -0.029 |
| RM2 | (-0.156, 0.064) | (-0.183, 0.029) | 0.044 | 0.018 / 0.026 | 0.010 | 52 | -0.020 / -0.001 |
| RM3 | (-0.189, 0.074) | (-0.228, 0.055) | 0.043 | 0.018 / 0.026 | 0.010 | 26 | +0.008 / +0.012 |
| RM4 | (-0.181, 0.105) | (-0.224, 0.099) | 0.043 | 0.018 / 0.026 | 0.010 | 8 | +0.004 / +0.011 |
| RM5 | (-0.167, 0.127) | (-0.211, 0.126) | 0.044 | 0.018 / 0.026 | 0.010 | 1 | -0.013 / +0.008 |
| RT1 | (-0.100, 0.102) | (-0.166, 0.076) | 0.071 | 0.022 / 0.038 | 0.014 | 22 | -0.038 / +0.003 |
| RT2 | (-0.100, 0.115) | (-0.167, 0.093) | 0.071 | 0.022 / 0.036 | 0.014 | 18 | -0.038 / +0.003 |
| RT3 | (-0.100, 0.128) | (-0.161, 0.109) | 0.064 | 0.020 / 0.034 | 0.014 | 17 | -0.038 / +0.000 |
| RT4 | (-0.100, 0.141) | (-0.147, 0.125) | 0.050 | 0.018 / 0.030 | 0.014 | 19 | -0.038 / -0.007 |
| RT5 | (-0.100, 0.154) | (-0.127, 0.147) | 0.028 | 0.012 / 0.020 | 0.012 | 15 | -0.038 / -0.018 |

**Overlap order (front to back, at any point).** M locks on top, then P, then F, then the fan body. Among the primaries, P5 (the tip lock) lies on top. Going away from P5 in either direction, each primary lies .003 under its neighbor nearer P5, so the edge reads as shingles fanned from the tip. Each M lies over the roots of the two primaries nearest it. In the tuft, T1 is deepest and each next lock (T2 to T5) lies .003 in front of the one before, so T1's long clean upper edge stays the tuft's top line and the lower tips make the serrated lower edge.

**Roots.** P1, F1 and M1 root on the ear-root crease at the skull's upper side (R01 spec mass 3, 4: (±.05, .06) to (±.062, .08)). They never root on the forehead or crown. If R01 moves the crease, move these three roots onto it and keep their tips. P9, P10, F9 and the tuft roots sit on the cup's lower rim or on the skull side line (u .100). None roots on the face or cheek. No P, F or M root lies inside the cup polygon.

**Fan body.** The locks lie on a fan body, the existing fan shell rebuilt as a solid plate, so that the gaps between them are never empty. Its outline is the target outline inset by .008 along the outer and lower edges and by .003 along the top edge (|x| below .25, within .03 of the top). Between two adjacent lock tips the notch bottom is therefore the body edge. The body edge is a rounded rim (section radius at least .004) with no waves in depth.

**Checks run on this structure** (2D footprints of the table against the sheet, at .00067 per pixel):

- Predicted front silhouette (sheet outside the fan, inset body, plus the locks): fan band missing .038 and extra .010 of the head band area, against .0405 and .0187 for the model today.
- Ear span .529 against the sheet's .523 at the same sampling (ratio about 1.01).
- Serrated points: 12 on L and 14 on R, .007 to .020 deep.
- Tip columns: x .26 spans y .023 to .062 (sheet .020 to .077) and x .27 spans .035 to .053 (sheet .028 to .056). At R, x -.26 spans .046 to .083 (sheet .044 to .091).
- Tuft footprint covers .62 (L) and .58 (R) of the cup polygon, with .03 and .07 of it outside the cup. Coat locks overlap the cup by .04 to .05, the rim lip.
- Coat lock footprints cover .78 (L) and .77 (R) of the fan front outside the cup and face. The rest is notch bottoms and root gaps on the body, none wider than one lock.
- Simulated side view from the +x and -x cameras (the depth table below, nearest element per (y, df) cell): visible tuft area .0025 (L) and .0023 (R), y .053 to .151 (L) and .076 to .161 (R), x_side -.027 to +.021. The sheet shows .0029 at -.02 to +.03.

## 3. Cross-sections and surface

**Depth plan (front-surface df against u, all rows .00 to .18).** This is the change that closes rank 19 and removes the dish. Panel E of `R03.png` plots it against the current mesh.

| u | .10 | .13 | .16 | .19 | .23 | .27 |
|---|---|---|---|---|---|---|
| Coat front, P locks (target) | -.040 | -.030 | -.014 | +.008 | +.016 | +.010 |
| Cup floor (inside the cup polygon) | -.026 | -.010 | +.006 | +.020 | | |
| Tuft front along T1, root to tip | -.038 | -.020 | -.003 | (tip at u .176: +.007) | | |
| Model front today, y .03 (L / R) | -.044 / -.039 | -.028 / -.031 | -.031 / -.033 | -.032 / -.033 | -.032 / -.028 | +.006 at .26 |
| Model front today, y .10 | -.042 / -.041 | +.009 / +.012 | +.003 / +.004 | -.008 / -.001 | +.008 / -.008 | |
| Model rear today, y .06 | +.069 | +.068 | +.069 | +.069 | +.056 | +.020 at .26 |

F locks sit .004 behind the P front at their position, and M locks .004 in front of it. Along the cup's lateral rim (L from (.199, .043) to (.173, .097); R from (-.186, .063) to (-.173, .113)) the coat front is no further forward than the floor minus .008. The cup is open toward the side there, which is what lets the tuft show in profile. The upper and lower rims stand .014 to .020 in front of the floor (u .10 to .16), and .012 at the upper tip. The wing rear stays at or before df .080, so the side silhouette rear (R01 and R04) does not grow, and the wing body keeps at least .012 of thickness out to u .24 (its rear is .051 to .056 at u .23 today). In plan the fan is a shallow swept V: the cup faces forward and outward, and the wing beyond it sits .02 to .05 further back than today's front face.

**Lock section (P, F, M).** A soft lens: the front face is convex, bulging half the thickness, and the back face is flat to slightly concave where it lies on the body or on the lock under it. The thickness falls from the middle value in the table to about 40 percent of it at t .9 and to .002 or less at the point. Width over thickness at the widest point is 2.4 to 2.6 (thickness .40 of the widest width). Length over widest width is at least 1.6 for every coat lock except R P10 (1.3), which is a drape tip. The tip lifts .003 to .005 off the surface under it, so each shingle edge catches a shadow, but never more than .008. The tip direction stays within 20 degrees of the local fan surface: no tip points at the viewer. Each lock is gently convex along its length (a camber of about .004 over its length) and carries no twist above 15 degrees.

**Cup.** The floor is smooth and concave across, with a section radius of .03 to .05, and slants back with u as in the depth table. The rim is one continuous edge from the inner top round the upper tip to the inner bottom, made by the roots of M1 to M5 and P7 to P10 rolling over into the cup with a rounded lip (radius .004 to .006). The rim's curvature runs on without lumps or kinks, except at the one sharp upper tip, whose interior angle is 50 to 65 degrees (L 54, R 65 in the polygon). Where the cup meets the skull side (u .100) there is no rim: a soft concave fillet, radius at least .006.

**Tuft (T1 to T5).** Fluffy pointed locks, rounder than the coat locks (width over thickness 1.7 to 2.7), fanning from the skull side line toward the upper outer tip of the cup. T1 is the longest (.084 L, .071 R). Its tip ends .009 to .011 below the upper rim and about .025 short of the cup's upper tip, so the tip of the hollow stays dark and pointed. Each tuft lock's front face bulges .006 above the line between its root and tip depths at t .4. The tuft joins the skin with a smooth union only within .010 of its roots (blend at most .002), so the tips stay separate points. A dark ring of cup floor .004 to .012 wide stays visible between the tuft and the rim on the upper and lower sides. That ring is the hollow R03.5 asks for.

**Pale material.** The tuft faces get a second material, `Pale inner-ear coat`, with base color value .58. Head clay is .38 and ocular white is .78. On the sheet the tuft sits at .60 of the way from fan fur (99) to eye white (234). In the clay render the fan reads about 146 and the eye white 248, so the tuft should render at a median of about 200 to 215 in `front.png` and `head-front.png`, at least 1.3 times the fan coat's median. Assign the material to every face within .0015 figure units (.0056 head-local) of the tuft's own distance field after meshing. The skin stays one closed mesh (I08); only the material index changes.

## 4. What it must not look like

The history card lists no earlier R03 attempts under this checklist. These are the failed looks visible in the baseline and in the fan's build chain (`head-0162` shape_ear_front_field, `head-0182` simplify_fan_field, `head-0187` author_fan_locks_field, then later blurs), each with the geometric reason it happens.

- **Crinkled, lettuce or kale rim.** The fan is a thin shell whose edge band waves forward and back in depth with a period of about .01 to .02. That is the residue of the reconstructed shards, closed and blurred by simplify_fan_field (closing 6 voxels, blur 2.5) and warped again. The outline stays smooth while the depth oscillates, so light picks out a crinkle and no point reads. Rule: all edge points are in-plane tips of separate locks, and depth varies along the edge only as the depth plan does (no oscillation above .003 within any .03 of edge).
- **Thorns.** Narrow round-section spikes, about .005 to .01 wide and as thick as they are wide, along the lower outer edge of both wings. They are pointed outward and toward the viewer, and they are the spikes shape_ear_front_field left outside its cup outline. Rule: width over thickness at least 2.4 at the widest point, and tips within 20 degrees of the fan surface.
- **Flat leaf plane and facets.** The head-0187 locks were .031 long, .016 wide and .0054 thick (figure units). That is half this spec's length, half its width and a third of its thickness, pressed flat onto the plate, and only 23 locks for both sides (7 of 15 edge stations placed). The plate between them read as one flat leaf. Rule: the sizes and counts in the tables, a body that is always covered or in a notch, and no exposed body patch wider than .03.
- **Dark empty triangular hollow.** The cup cut removed everything in front of a ramp floor inside a polygon and put nothing back. Rule: the tuft fills .55 or more of the cup polygon, and the floor is a smooth concave bowl, not a ramp plane.
- **Rolled top lip (the dish).** The top band's front face is at df -.028 to -.033 from u .13 to .23. That is .03 to .04 in front of the cup floor (+.003 to +.012) and of the outer wing front (y .10), so from the front you look at the curled underside of a lip, and the fan reads as a dish tilted back. Rule: the depth plan, which moves the top band back .017 (u .16) to .048 (u .23).
- **Knobs, scales and shingles.** Knobs came from the morphological opening in shape_ear_front_field step 3, which turns spikes into "broad blunt leaf tips". Scales came from its jittered lattice of locks in rows across the radial direction (spacing .016). Rule: sharp points (width at t .9 at most a quarter of the widest), placement by this table along radial lines, and no row of similar locks across the radial direction.
- **Blunt square tip.** The wing ends in a vertical edge .036 tall (L) and .030 tall (R) because the shell was trimmed to the span, not ended in a lock. Rule: the tip is P5 with F4 and F5 beside it, at the measured points.

## 5. Gap audit rows: kind and order (most visible first)

1. **Rank 4, fan edge and surface (crinkle, thorns, flat leaf plane, knobs): structural.** Rebuild the fan front as a body plate with the 24 coat locks per side from the tables. The outline envelope stays the target, but the edge and surface are new construction, not a sculpt of the current shell. Serves R03.4, R03.7, and R03.3's point shape.
2. **Rank 4, empty cup, no pale tuft: structural (a new volume and a material).** Five tuft locks per side, the reshaped cup floor, a clean rim with a pointed upper tip, and the pale material. Serves R03.5 and R03.7.
3. **Rolled top lip and dish read: structural (depth proportion lever on the fan).** Move the top band and the outer wing back to the depth plan. Serves R03.3 (the V reads once the lip is gone) and R03.4.
4. **Rank 19, no inner cup from the side: structural (ear orientation in plan).** The same depth plan, plus the open lateral rim. Visible tuft area in profile at least .0020 (sheet .0029). This row has no R03 criterion yet (friction 4).
5. **Blunt square tips: local outline fix, done by the P5, F4, F5 and P6 rows.** Only if the rebuild is staged could it be done alone, as a trim of the shell's end to the tip column table. Serves R03.3.
6. **Lower edge drape (R03.6, passing): keep.** P8 to P10 and F8 and F9 hang from the lower rim toward the cheek. No lower lock root or tip may sit more than .004 above the sheet's bottom edge in the edge table.

## 6. Acceptance

| Criterion | Baseline (assembled-0291) | Target | Predicted from the structure checks |
|---|---|---|---|
| R03.1 front ear span within 3 percent | .991 | .97 to 1.03; P5 tips at (.276, .033) and (-.273, .057) | about 1.01 to 1.02 |
| R03.2 front head band missing at most .06 | .0516 | fan part at most .045; hold the body inset at .008 (.003 on top) | about .049 (fan .038 plus .0105 outside the fan) |
| R03.3 V tilt and up-flared pointed tips | fail | top edge within .005 of the edge table; tip columns as in section 1; no vertical run at a tip longer than .010 | visual |
| R03.4 8 to 10 large pointed locks per side radiating from the ear roots | fail | P1 to P8 at the table's sizes, plus F and M layers; 10 to 17 serrated points per side | visual; 12 and 14 points |
| R03.5 a cupped hollow with a clean rim and a pointed upper tip | partial | cup polygon, floor .014 to .020 behind the upper and lower rims, rim lip radius .004 to .006, upper tip angle 50 to 65 degrees, dark ring .004 to .012 around the tuft | visual |
| R03.6 lower edge drapes toward the cheeks | pass | keep (section 5, row 6) | visual |
| R03.7 pale pointed tuft covering at least half the cup; edge all pointed locks | fail | tuft footprint at least .55 of the cup polygon; tuft render median 200 to 215, at least 1.3 times the fan coat; no crinkle, thorn or flat plane | visual; .62 and .58 |
| Rank 19 (no criterion yet): tuft visible in profile | 0 | visible pale area in left.png at least .0020 per side, at x_side -.03 to +.03, y .055 to .16 | .0025 and .0023 |
| R01.3 crown in front of the ear roots (side effect) | partial | fan front at |x| .10 at least .015 behind the skull at |x| .07, rows .04 to .09: the coat front at u .10 is -.040 against the skull at -.068 to -.078 | holds |
| I08 one closed mesh | pass | the tuft joins by smooth union at its roots; the material split does not open the skin | pass |
| I09 figure height | pass | no lock tip above y .001 (P3 on L is the highest at .002) | pass |

Builder checks before a Blender build: splat the lock footprints into the fit frame and confirm the predicted front band numbers above within .005. Read the depth plan off the mesh at rows .03, .06, .10 and .14 (the table conversions above), and confirm the tuft's profile visibility with a left-view render whose tuft material is set to a flat color.

Friction for the orchestrator:

1. **The model's face is wider than the sheet's at eye level.** The skull side line is at u .100 (the sheet's cup inner edge is at u .080 to .087), and the model's eye whites reach u .082. This spec puts the cup's inner edge and the tuft roots on u .100, which costs about .015 of cup width per side. If R02 narrows the face to the sheet, move the cup inner edge and the tuft root line in with it and keep every other point. Nothing here may cut into the face or the eyes.
2. **R03.7's "at least half" is stricter than the sheet measures.** By segmentation the sheet's tuft covers .37 to .48 of its cup, depending on the threshold. This spec aims at .55 to .63 of a tighter cup polygon, which reads as at least half. Proposed measured form: "pale tuft area in the front view at least .0030 per side and at least .5 of the cup polygon in the spec".
3. **A pale tuft needs a second material in the clay render.** Under one clay material, "pale" can only come from lighting. The invariants do not forbid a material, and the eye whites already use one. If the orchestrator rules materials out, R03.7 cannot pass by geometry alone, and the criterion should say "a fluffy pointed inner tuft" without "pale".
4. **Gap audit rank 19 has no criterion.** The proposed one is in section 6: visible inner cup or tuft area in `left.png` at least .0020 per side (sheet .0029).
5. **R03.3's "crown .02 to .03 below the tips" holds on the sheet only on the L side** (.022 to .024 to the cleft). The R wing's top is level with the crown cleft (.023 to .028 against .022 to .025). Proposed wording: "the top edge follows the edge table within .005, and the L wing rises at least .018 above the cleft beside the crown".
6. **The depth plan moves the wing's front face back** by up to .048 at u .23 on the top band, and keeps the rear at or before df .080. R04 (fan rear) shares this volume. Its back-view outline does not change, but if R04 later deepens the rear coat, the side silhouette rear must still stay within the R01 profile table.
