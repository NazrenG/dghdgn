using AllowlistApi.Auth;
using AllowlistApi.Models;
using AllowlistApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AllowlistApi.Controllers;

[ApiController]
[Route("api/me")]
[Authorize(Policy = Policies.AllowedUser)]
public class MeController(IUserAccessService access) : ControllerBase
{
    /// <summary>Returns the signed-in user's profile. 403 if the email is not allowlisted.</summary>
    [HttpGet]
    public async Task<ActionResult<MeResponse>> Get(CancellationToken ct)
    {
        var result = await access.GetAccessAsync(User, ct);
        return new MeResponse(
            result.Email!,
            EmailClaimExtractor.GetDisplayName(User),
            result.Role!,
            result.IsAdmin,
            result.IsBootstrapAdmin);
    }
}
