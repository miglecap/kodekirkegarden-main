# Flowchart: cleaning up Romvakt before the Node upgrade

Based on the scenario in [scenario.md](scenario.md). The agent only reads and reports. Every deletion is a human decision.

```mermaid
flowchart TD
    start(["🔔 Trigger<br/>Security review flags <b>request</b> (deprecated)<br/>Node upgrade planned next sprint"])
    start --> run["👤 Jonas runs the sweep<br/><code>npm start -- --rapport</code>"]

    subgraph agent["🤖 Agent loop (read-only)"]
        direction TB
        a1["list_filer + avhengigheter<br/>what exists, which packages are used"]
        a2["sok_i_repo / les_fil<br/>TODOs, skipped tests, flags, commented code"]
        a3["finn_referanser<br/>who uses it?"]
        a4["Indirect use check<br/>config strings · dynamic import · npm scripts · README"]
        a5["hent_git_historikk<br/>last touched, by whom, how many years ago"]
        a1 --> a2 --> a3 --> a4 --> a5
        a5 -->|"more candidates"| a2
    end

    run --> agent
    agent --> report["📜 nekrologer.md<br/>verdict · evidence · uncertainty<br/>+ «Skal IKKE fjernes»"]

    report --> review{"👤 Jonas reads<br/>each finding"}

    review -->|"Trygt"| safe["Safe to bury<br/>lodash · request · sinon<br/>commented-out code"]
    review -->|"Usikkert"| unsure["Needs a decision<br/>legacyCsv.js · nyKalender · eksternRabatt"]
    review -->|"Behold"| keep["Do NOT remove<br/>formaterBookingForLonn<br/>ryddGamleBookinger · teams plugin"]

    safe --> verify["Verify the claim<br/>re-ask the agent or grep"]
    verify --> pr["Open PR: remove safe items"]
    pr --> tests{"Tests + lint<br/>pass?"}
    tests -->|"no"| fix["Investigate: something<br/>was in use after all"]
    fix --> review
    tests -->|"yes"| merge["Review and merge"]

    unsure --> who{"Who owns<br/>the answer?"}
    who -->|"Finance"| fin["Ask finance:<br/>is the CSV export still needed?"]
    who -->|"Product owner"| po["Ask: will the new calendar<br/>or external discount ship?"]
    fin --> ans{"Confirmed<br/>dead?"}
    po --> ans
    ans -->|"yes"| pr
    ans -->|"no / no answer"| keep

    keep --> ask["Control question<br/><code>Er formaterBookingForLonn trygg å fjerne?</code>"]
    ask -->|"Behold, with evidence"| doc["Document why it stays<br/>consider contacting the lonn-integrasjon team"]

    merge --> done(["✅ Fewer dependencies<br/>Open questions have owners<br/>No trap deleted"])
    doc --> done
```

## Reading the chart

| Lane | Who acts | What can go wrong | Safeguard |
|---|---|---|---|
| Agent loop | Agent | Misses indirect use, or cites a search that didn't really run | Mandatory indirect-use check, evidence listed in the report, regex hint in `sok_i_repo` |
| Review | Jonas | Trusting a verdict blindly | The report states what was not checked, and every deletion goes through a PR |
| Unsure branch | Finance, product owner | No answer arrives | «No answer» defaults to keeping the code |
| Keep branch | Jonas | Someone later deletes it again | Documented reason in the repo |

## Real numbers from the project

- The sweep task used 37 tool calls and mentioned 9 of 9 safe items in the eval. Its own duration wasn't logged: all three eval tasks together took 1m12.
- The control question took 3 rounds and 5 tool calls, and ended with Dom: Behold.
- The eval run was a single run, and the agent is not deterministic.
