using System.ComponentModel.DataAnnotations;

namespace AllowlistApi.Models;

public record MeResponse(string Email, string? Name, string Role, bool IsAdmin, bool IsBootstrapAdmin);

public record AllowedUserResponse(int Id, string Email, string Role, bool IsActive, DateTime CreatedAtUtc, string? CreatedBy)
{
    public static AllowedUserResponse From(AllowedUser u) =>
        new(u.Id, u.Email, u.Role, u.IsActive, u.CreatedAtUtc, u.CreatedBy);
}

public class CreateAllowedUserRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    /// <summary>Optional: "User" (default) or "Admin".</summary>
    public string? Role { get; set; }
}

public class UpdateAllowedUserRequest
{
    public bool? IsActive { get; set; }

    public string? Role { get; set; }
}
