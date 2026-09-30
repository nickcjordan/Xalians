# Recovered script versions for the Akinza rebuild

These are the exact bytes of script versions that Akinza stages ran but that were never committed. Each folder is named after a step in [rebuild-plan.json](../../rebuild-plan.json) and holds the entry script, plus `blender_blockout.py` where that step used an uncommitted version of it. Helpers not listed here ran from a commit, as recorded in each step's `helpers`.

`.gitattributes` in this folder turns off line-ending conversion, because several files have the CRLF or mixed CRLF/LF endings they had on disk. That matters for the sha256 values, not for how the scripts behave.

## How they were made

Every file was produced by [`art/species-construction/rebuild/replay_codex_edits.py`](../../../../../../art/species-construction/rebuild/replay_codex_edits.py) using the rules in [`akinza_recovered_scripts.json`](../../../../../../art/species-construction/rebuild/akinza_recovered_scripts.json):

```
python art/species-construction/rebuild/replay_codex_edits.py --spec art/species-construction/rebuild/akinza_recovered_scripts.json --out docs/design/species-construction/akinza/rebuild/recovered-scripts --check 2026-09-28T23:28:30Z@ba7cd0e3
```

The tool starts from the raw blobs of commit 414f48af. It re-applies every file edit in the four Codex rollouts, in timestamp order, and copies each file at the moment of the step's command. It exits with an error unless every file matches the sha256 below. The ba7cd0e3 checkpoint passes with no mismatch.

Rollouts, all under `C:\Users\njord\.codex\`:

- main: `sessions\2026\09\27\rollout-2026-09-27T12-42-03-01a0e3f5-ad0c-7980-905a-1595945478d8.jsonl`
- head: `archived_sessions\rollout-2026-09-28T10-36-38-01a0e8a9-3304-7602-99af-8b00f91acd6e.jsonl`
- body: `archived_sessions\rollout-2026-09-28T12-29-50-01a0e910-d631-7990-8d6f-dd97b1df28d2.jsonl`
- paw: `archived_sessions\rollout-2026-09-28T20-19-35-01a0eabe-e7d4-7de3-a235-fb9fe4b863ec.jsonl` (no chain edits, but it is replayed so the state is complete)

"Confirmed by" names the independent record the recovered hash matches.

## Files

| Step | Stage | File | sha256 | Endings | Snapshot at (rollout, exec call) | Confirmed by |
|---|---|---|---|---|---|---|
| B02 | body-reconstruction-0028/attempt-01 | `B02/reconstruct_shape.py` | `0ee5b2d287aec35965ab01ee278e102cfe2f7cea647cb9a521f85afca8d4e1b2` | LF | 2026-09-28T21:37:18Z, main, call_eGK2ebZITwf8EwIO8ImlL3P0 | `scriptSha256` in reconstruction-experiments-0022-0068.json |
| B04 | paw-reconstruction-0041/attempt-01 | `B04/reconstruct_shape.py` | `dbf322ed5e78cb41c38032dd6ed64bd4e71a6555b2502ff07f4a7011ec4de946` | LF | 2026-09-28T22:22:44Z, main, call_AaCFlAPlqaVwFoslpyePQGgg | `scriptSha256` in reconstruction-experiments-0022-0068.json |
| S02 | head-full-0058 | `S02/reconstruct_shape.py` | `35aa04f0dcb83edb35ae33d52a6965bdb0808993bb568811328b2420c107ee20` | LF | 2026-09-28T23:02:11Z, main, call_OFGLQ9imVv4m3uGGlHMJzzbO | `scriptSha256` and `reconstruction_source.py` hash in reconstruction-experiments-0022-0068.json |
| B05 | body-0072/attempt-02 | `B05/refine_reconstructed_body.py` | `a068b52fc3b0278c7943558f14454b952a36e37a8cee91393a0ed488ef225cad` | mixed | 2026-09-28T23:34:37Z, main, call_5ajdHKPNhO5Y2apWcCEVD8pj | `scriptSha256` and source-snapshot hash in reconstruction-experiments-0069-0076.json |
| B07 | body-0086/attempt-03 | `B07/integrate_reconstructed_paws.py` | `f5943d9d29552d447a4c063da4d829f293b7ff7a4efc7b47508d665e5ebe67f0` | mixed | 2026-09-29T00:17:17Z, body, call_3ba151QBCfXqJMOWNS5J7MDA | stage-start.json printed in the body rollout at 00:25:46Z |
| B07 | body-0086/attempt-03 | `B07/blender_blockout.py` | `d861ad5bc615c25e34caf309c10d0b928cdeedde3d5490ef9d3d044dbaaa7f2a` | LF | same | same stage-start.json |
| B08 | body-0100/attempt-02 | `B08/fair_reconstruction_joints.py` | `588a276ee6e4fd5c0ab397106f62cd207e7594716e3a875bec7537851e41ba8f` | mixed | 2026-09-29T00:37:32Z, body, call_RJSOFuW6cj2cH27d9Ip23PLo | recomputed stage-start.json hash equals the recorded `e77e21c3...` |
| B08 | body-0100/attempt-02 | `B08/blender_blockout.py` | `b22f1565e30d33c60bb97b1489b46ba4c8fad1de631badb4bcd5ee372a7d363a` | LF | same | head-0100 stage-start.json (same version) and the recomputed hash above |
| S05 | head-0095 | `S05/refine_reconstructed_head.py` | `14b45dab83edb80aaf82852d41bbd23296c1f77fc6762e52aca54c38d06ae901` | CRLF | 2026-09-29T00:23:26Z, head, call_PCCwrzPJHqrO8V2N9kl1Dx28 | no hash; the file size (18,767 bytes) equals `refine_source.py` in head-0095 as listed by the head rollout at 00:24:43Z |
| S05 | head-0095 | `S05/blender_blockout.py` | `d861ad5bc615c25e34caf309c10d0b928cdeedde3d5490ef9d3d044dbaaa7f2a` | LF | same | same version as B07 |
| S06 | head-0100 | `S06/transplant_reconstructed_muzzle.py` | `4f79af4a5b9a283750c48e0c4ee7d6d961a1e4788055bc9f22e5b3cedc1b2341` | LF | 2026-09-29T00:39:38Z, head, call_jWbOZpMs4gdRx7C7BkvEHTcL | stage-start.json printed in the body rollout at 00:53:52Z, and recomputed stage-start hash `b1eb8fe8...` |
| S06 | head-0100 | `S06/blender_blockout.py` | `b22f1565e30d33c60bb97b1489b46ba4c8fad1de631badb4bcd5ee372a7d363a` | LF | same | same stage-start.json |
| S07 | head-0109 | `S07/refine_reconstructed_coat.py` | `3eef4fefecbfb5105dfdda6924f485d84d85e6e25d0d612729a1069d342b29d5` | CRLF | 2026-09-29T01:04:42Z, head, call_uflCRRJtDv4UH1MhzJ2aVA6R | no hash; replay only |
| S08 | head-0109/recovered-02 | `S08/recover_0109_flakes.py` | `e7ca2554c40869fc7d4d8ba97af8933f5c56b10aceac47f33ccd54032acc0300` | CRLF | 2026-09-29T01:14:15Z, head, call_C3UCaE2OKWdf82rjiibwZ32w (written by Set-Content in call_2dZs6bP64LljwONFDl7QjdDO at 01:12:54Z) | no hash; replay only |

To run a step with its recovered version, copy the files over `art/species-construction/<name>` in the build tree. For S08, copy to `untracked/species-construction/akinza/recover_0109_flakes.py`. Restore the committed versions afterwards. The helpers must sit next to the entry script, because each script imports its neighbours from its own folder.
