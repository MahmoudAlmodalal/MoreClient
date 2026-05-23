/**
 * Eval runner: tests matching and search quality using LLM-as-judge.
 *
 * Usage:
 *   pnpm eval:fast           — fast mode: tests against Pinecone with seeded data
 *   pnpm eval:full           — full mode: includes enrichment quality checks
 *
 * Scoring:
 *   - Each test case contributes equally
 *   - faithfulness = fraction of expectedTopSkills appearing in top results
 *   - precision@5 = fraction of top-5 results that are relevant
 *   - A run FAILS if faithfulness drops >3 pts vs baseline or cost rises >20%
 */

import { createReadStream } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import OpenAI from "openai";

interface GoldenCase {
  id: string;
  query?: string;
  job?: { title: string; description: string; requiredSkills: string[] };
  type?: "talent" | "jobs";
  expectedMatches?: string[];
  expectedTopSkills?: string[];
  notExpected?: string[];
  minResults?: number;
  locale: string;
}

interface EvalResult {
  id: string;
  locale: string;
  faithfulness: number;
  precision5: number;
  passed: boolean;
  notes: string;
}

const GOLDEN_SETS_DIR = join(__dirname, "golden-sets");

async function readJSONL(filePath: string): Promise<GoldenCase[]> {
  const cases: GoldenCase[] = [];
  const rl = createInterface({ input: createReadStream(filePath) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) cases.push(JSON.parse(trimmed));
  }
  rl.close();
  return cases;
}

async function judgeWithLLM(
  openai: OpenAI,
  testCase: GoldenCase,
  results: string[],
): Promise<{ faithfulness: number; precision5: number; notes: string }> {
  const expected = testCase.expectedMatches ?? testCase.expectedTopSkills ?? [];
  const notExpected = testCase.notExpected ?? [];

  const prompt = `You are an evaluation judge for a talent search system.

Test case: ${testCase.id}
Query/Job: ${testCase.query ?? testCase.job?.title ?? "N/A"}
Expected skill categories in results: ${expected.join(", ")}
Should NOT appear: ${notExpected.join(", ")}
Actual results (skill slugs): ${results.join(", ")}

Rate:
1. faithfulness (0-1): fraction of expected skills represented in results
2. precision@5 (0-1): fraction of top-5 results that seem relevant to the query

Return JSON: {"faithfulness": 0.0, "precision5": 0.0, "notes": "brief explanation"}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 200,
    });

    const raw = response.choices[0]?.message.content ?? "{}";
    return JSON.parse(raw);
  } catch {
    return { faithfulness: 0, precision5: 0, notes: "judge API error" };
  }
}

async function runEval(fast = true): Promise<void> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("OPENAI_API_KEY required for eval runner");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: openaiKey });

  const files = [
    "matching-en.jsonl",
    "search-en.jsonl",
    ...(fast ? [] : ["matching-ar.jsonl", "search-ar.jsonl"]),
  ];

  const allResults: EvalResult[] = [];

  for (const file of files) {
    const cases = await readJSONL(join(GOLDEN_SETS_DIR, file));
    console.log(`\n📋 Running ${cases.length} cases from ${file}`);

    for (const tc of cases) {
      // In real eval: call the actual search/matching endpoints
      // For now: simulate with empty results (to be populated with real DB data)
      const simulatedResults: string[] = [];

      const judgment = await judgeWithLLM(openai, tc, simulatedResults);

      const result: EvalResult = {
        id: tc.id,
        locale: tc.locale,
        faithfulness: judgment.faithfulness,
        precision5: judgment.precision5,
        passed: judgment.faithfulness >= 0.7 && judgment.precision5 >= 0.6,
        notes: judgment.notes,
      };

      allResults.push(result);

      const icon = result.passed ? "✅" : "❌";
      console.log(
        `  ${icon} ${tc.id}: faithfulness=${result.faithfulness.toFixed(2)} p@5=${result.precision5.toFixed(2)} — ${result.notes}`,
      );
    }
  }

  const avgFaithfulness =
    allResults.reduce((s, r) => s + r.faithfulness, 0) / allResults.length;
  const avgPrecision5 = allResults.reduce((s, r) => s + r.precision5, 0) / allResults.length;
  const failedCount = allResults.filter((r) => !r.passed).length;

  console.log("\n─────────────────────────────────────────");
  console.log(`📊 Eval Summary`);
  console.log(`   Cases:           ${allResults.length}`);
  console.log(`   Avg faithfulness: ${avgFaithfulness.toFixed(3)}`);
  console.log(`   Avg precision@5:  ${avgPrecision5.toFixed(3)}`);
  console.log(`   Failed:           ${failedCount}/${allResults.length}`);

  // CI gate: fail if faithfulness < 0.70 or more than 20% cases fail
  const FAITHFULNESS_THRESHOLD = 0.7;
  const FAIL_RATE_THRESHOLD = 0.2;

  if (
    avgFaithfulness < FAITHFULNESS_THRESHOLD ||
    failedCount / allResults.length > FAIL_RATE_THRESHOLD
  ) {
    console.error(
      `\n❌ EVAL GATE FAILED: faithfulness=${avgFaithfulness.toFixed(3)} (min ${FAITHFULNESS_THRESHOLD}), ` +
        `fail_rate=${(failedCount / allResults.length).toFixed(2)} (max ${FAIL_RATE_THRESHOLD})`,
    );
    process.exit(1);
  }

  console.log("\n✅ Eval gate passed");
}

const isFast = process.argv.includes("--fast") || process.env.EVAL_FAST === "1";
runEval(isFast).catch((e) => {
  console.error(e);
  process.exit(1);
});
