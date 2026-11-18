using System.Security.Claims;
using AllowlistApi.Auth;
using AllowlistApi.Data;
using AllowlistApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AllowlistApi.Services;

public record UserAccess(string? Email, bool IsAllowed, string? Role, bool IsBootstrapAdmin)
{
    public bool IsAdmin => IsAllowed && Role == Roles.Admin;
}

public interface IUserAccessService
{
    string BootstrapAdminEmail { get; }

    Task<UserAccess> GetAccessAsync(ClaimsPrincipal user, CancellationToken ct = default);
}

/// <summary>
/// Resolves whether the signed-in principal may use the app.
/// Scoped per request; the result is cached so multiple authorization checks in one
/// request only hit the database once.
/// </summary>
public class UserAccessService(AppDbContext db, IConfiguration configuration) : IUserAccessService
{
    // Hardcoded bootstrap admin. Can be overridden by config, but defaults to this value
    // so the app is never locked out even when AllowedUsers is empty.
    private const string DefaultBootstrapAdmin = "quliyevanzrin162@gmail.com";

    private UserAccess? _cached;

    public string BootstrapAdminEmail { get; } =
        EmailClaimExtractor.Normalize(configuration["Admin:BootstrapAdminEmail"]) ?? DefaultBootstrapAdmin;

    public async Task<UserAccess> GetAccessAsync(ClaimsPrincipal user, CancellationToken ct = default)
    {
        if (_cached is not null) return _cached;

        var email = EmailClaimExtractor.GetNormalizedEmail(user);

        if (email is null)
        {
            return _cached = new UserAccess(null, false, null, false);
        }

        if (email == BootstrapAdminEmail || email == DefaultBootstrapAdmin)
        {
            return _cached = new UserAccess(email, true, Roles.Admin, true);
        }

        var row = await db.AllowedUsers
            .AsNoTracking()
            .Where(u => u.Email == email && u.IsActive)
            .Select(u => new { u.Role })
            .FirstOrDefaultAsync(ct);

        return _cached = row is null
            ? new UserAccess(email, false, null, false)
            : new UserAccess(email, true, Roles.Normalize(row.Role), false);
    }
}
