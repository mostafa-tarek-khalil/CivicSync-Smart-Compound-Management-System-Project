/**
 * Auth normalisation contract: e-mails are always stored (and compared) in
 * trim + lower-case form, in one shared helper used by register, login and
 * the password-reset flow.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const authService = require("../services/authService");

test("normalizeEmail trims and lower-cases", () => {
    assert.equal(
        authService.normalizeEmail("  Resident@Example.COM  "),
        "resident@example.com"
    );
});

test("normalizeEmail tolerates non-string input", () => {
    assert.equal(authService.normalizeEmail(undefined), "");
    assert.equal(authService.normalizeEmail(null), "");
    assert.equal(authService.normalizeEmail(42), "");
});

test("normalizeEmail is idempotent", () => {
    const once = authService.normalizeEmail("  MIXED@Case.io ");
    assert.equal(authService.normalizeEmail(once), once);
});

test("the password-reset flow is exported", () => {
    assert.equal(typeof authService.requestPasswordReset, "function");
    assert.equal(typeof authService.resetPassword, "function");
});

test("resetPassword rejects short or missing passwords before touching the DB", async () => {
    await assert.rejects(
        () => authService.resetPassword("some-token", "short"),
        (error) => error.statusCode === 400
    );

    await assert.rejects(
        () => authService.resetPassword("some-token", undefined),
        (error) => error.statusCode === 400
    );
});

test("resetPassword rejects a missing token before touching the DB", async () => {
    await assert.rejects(
        () => authService.resetPassword("", "a-valid-password"),
        (error) => error.statusCode === 400
    );
});

test("requestPasswordReset requires an e-mail", async () => {
    await assert.rejects(
        () => authService.requestPasswordReset("   "),
        (error) => error.statusCode === 400
    );
});
