using System.Security.Claims;

namespace AllowlistApi.Auth;

public static class EmailClaimExtractor
{
    // Order matters: "email" first, then "preferred_username", then "upn".
    // The ClaimTypes.* URIs cover the case where inbound claim mapping is enabled.
    private static readonly string[] EmailClaimTypes =
    [
        "email",
        ClaimTypes.Email,
        "preferred_username",
        "upn",
        ClaimTypes.Upn,
    ];

    /// <summary>
    /// Returns the user's email normalized with Trim().ToLowerInvariant(),
    /// or null if no claim contains something that looks like an email address.
    /// </summary>
    public static string? GetNormalizedEmail(ClaimsPrincipal? user)
    {
        if (user is null) return null;

        foreach (var type in EmailClaimTypes)
        {
            var value = user.FindFirst(type)?.Value;
            var normalized = Normalize(value);
            if (normalized is not null && normalized.Contains('@'))
            {
                return normalized;
            }
        }

        return null;
    }

    public static string? GetDisplayName(ClaimsPrincipal? user) =>
        user?.FindFirst("name")?.Value ?? user?.FindFirst(ClaimTypes.Name)?.Value;

    public static string? Normalize(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        return email.Trim().ToLowerInvariant();
    }
}
