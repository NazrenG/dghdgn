using AllowlistApi.Auth;
using AllowlistApi.Data;
using AllowlistApi.Models;
using AllowlistApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AllowlistApi.Controllers;

[ApiController]
[Route("api/allowed-users")]
[Authorize(Policy = Policies.Admin)]
public class AllowedUsersController(AppDbContext db, IUserAccessService access, ILogger<AllowedUsersController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AllowedUserResponse>>> List(CancellationToken ct)
    {
        var users = await db.AllowedUsers
            .AsNoTracking()
            .OrderBy(u => u.Email)
            .ToListAsync(ct);

        return users.Select(AllowedUserResponse.From).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<AllowedUserResponse>> Create([FromBody] CreateAllowedUserRequest request, CancellationToken ct)
    {
        var email = EmailClaimExtractor.Normalize(request.Email);
        if (email is null || !email.Contains('@'))
        {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.Email)] = ["A valid email address is required."],
            }));
        }

        if (request.Role is not null && !Roles.IsValid(request.Role))
        {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.Role)] = [$"Role must be '{Roles.User}' or '{Roles.Admin}'."],
            }));
        }

        var role = Roles.Normalize(request.Role);
        var me = await access.GetAccessAsync(User, ct);

        var existing = await db.AllowedUsers.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existing is not null)
        {
            if (existing.IsActive)
            {
                return Conflict(new { error = "already_exists", message = $"{email} is already allowed." });
            }

            // Re-adding a deactivated email simply re-activates it.
            existing.IsActive = true;
            existing.Role = role;
            await db.SaveChangesAsync(ct);
            logger.LogInformation("{Admin} re-activated {Email} as {Role}", me.Email, email, role);
            return Ok(AllowedUserResponse.From(existing));
        }

        var user = new AllowedUser
        {
            Email = email,
            Role = role,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedBy = me.Email,
        };
        db.AllowedUsers.Add(user);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Most likely lost a race with a concurrent insert of the same email (unique index).
            db.Entry(user).State = EntityState.Detached;
            if (await db.AllowedUsers.AnyAsync(u => u.Email == email, ct))
            {
                return Conflict(new { error = "already_exists", message = $"{email} is already allowed." });
            }
            throw;
        }

        logger.LogInformation("{Admin} added {Email} as {Role}", me.Email, email, role);
        return CreatedAtAction(nameof(List), null, AllowedUserResponse.From(user));
    }

    [HttpPatch("{id:int}")]
    public async Task<ActionResult<AllowedUserResponse>> Update(int id, [FromBody] UpdateAllowedUserRequest request, CancellationToken ct)
    {
        var user = await db.AllowedUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        if (request.Role is not null && !Roles.IsValid(request.Role))
        {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                [nameof(request.Role)] = [$"Role must be '{Roles.User}' or '{Roles.Admin}'."],
            }));
        }

        var me = await access.GetAccessAsync(User, ct);
        var isSelf = user.Email == me.Email;
        var losesAccess = request.IsActive == false || (request.Role is not null && Roles.Normalize(request.Role) != Roles.Admin);
        if (isSelf && !me.IsBootstrapAdmin && losesAccess)
        {
            return BadRequest(new { error = "self_lockout", message = "You cannot remove your own admin access." });
        }

        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
        if (request.Role is not null) user.Role = Roles.Normalize(request.Role);

        await db.SaveChangesAsync(ct);
        logger.LogInformation("{Admin} updated {Email}: active={Active} role={Role}", me.Email, user.Email, user.IsActive, user.Role);
        return AllowedUserResponse.From(user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var user = await db.AllowedUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        var me = await access.GetAccessAsync(User, ct);
        if (user.Email == me.Email && !me.IsBootstrapAdmin)
        {
            return BadRequest(new { error = "self_lockout", message = "You cannot delete your own access." });
        }

        db.AllowedUsers.Remove(user);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("{Admin} deleted {Email}", me.Email, user.Email);
        return NoContent();
    }
}
