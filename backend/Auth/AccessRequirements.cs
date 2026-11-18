using AllowlistApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace AllowlistApi.Auth;

public static class Policies
{
    public const string AllowedUser = "AllowedUser";
    public const string Admin = "Admin";
}

public static class FailureCodes
{
    public const string NotAllowlisted = "email_not_authorized";
    public const string NotAdmin = "admin_required";
}

/// <summary>The caller's email must be in AllowedUsers (active) or be the bootstrap admin.</summary>
public class AllowedUserRequirement : IAuthorizationRequirement;

/// <summary>The caller must be allowed AND have the Admin role.</summary>
public class AdminRequirement : IAuthorizationRequirement;

public class AllowedUserHandler(IUserAccessService access) : AuthorizationHandler<AllowedUserRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AllowedUserRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true) return;

        var result = await access.GetAccessAsync(context.User);
        if (result.IsAllowed)
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail(new AuthorizationFailureReason(this, FailureCodes.NotAllowlisted));
        }
    }
}

public class AdminHandler(IUserAccessService access) : AuthorizationHandler<AdminRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true) return;

        var result = await access.GetAccessAsync(context.User);
        if (result.IsAdmin)
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail(new AuthorizationFailureReason(this,
                result.IsAllowed ? FailureCodes.NotAdmin : FailureCodes.NotAllowlisted));
        }
    }
}
