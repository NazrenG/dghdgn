using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace AllowlistApi.Auth;

/// <summary>
/// Turns authorization failures into JSON bodies the SPA can render:
///   401 -> not signed in / invalid token
///   403 -> { error: "email_not_authorized" | "admin_required", message }
/// </summary>
public class JsonAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden)
        {
            var reasons = authorizeResult.AuthorizationFailure?.FailureReasons.Select(r => r.Message).ToList() ?? [];
            var code = reasons.Contains(FailureCodes.NotAllowlisted) ? FailureCodes.NotAllowlisted
                     : reasons.Contains(FailureCodes.NotAdmin) ? FailureCodes.NotAdmin
                     : FailureCodes.NotAllowlisted;

            var message = code == FailureCodes.NotAdmin
                ? "Access Denied: This action requires an administrator."
                : "Access Denied: Your email is not authorized";

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                error = code,
                message,
                email = EmailClaimExtractor.GetNormalizedEmail(context.User),
            });
            return;
        }

        if (authorizeResult.Challenged)
        {
            // Let JwtBearer emit the WWW-Authenticate header, then add a JSON body.
            await _default.HandleAsync(next, context, policy, authorizeResult);
            if (!context.Response.HasStarted)
            {
                await context.Response.WriteAsJsonAsync(new { error = "unauthenticated", message = "Sign in required." });
            }
            return;
        }

        await _default.HandleAsync(next, context, policy, authorizeResult);
    }
}
