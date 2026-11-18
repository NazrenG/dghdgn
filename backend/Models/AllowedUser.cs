namespace AllowlistApi.Models;

public class AllowedUser
{
    public int Id { get; set; }

    /// <summary>Always stored normalized: trimmed and lower-cased.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>"User" or "Admin". See <see cref="Roles"/>.</summary>
    public string Role { get; set; } = Roles.User;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public string? CreatedBy { get; set; }
}

public static class Roles
{
    public const string User = "User";
    public const string Admin = "Admin";

    public static bool IsValid(string? role) =>
        string.Equals(role, User, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase);

    public static string Normalize(string? role) =>
        string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase) ? Admin : User;
}
