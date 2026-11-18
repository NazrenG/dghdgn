using AllowlistApi.Auth;
using AllowlistApi.Data;
using AllowlistApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------- Fail fast on missing configuration ----------
var clientId = config["AzureAd:ClientId"];
if (string.IsNullOrWhiteSpace(clientId) || clientId.StartsWith("PASTE-", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException(
        "AzureAd:ClientId is not set. Paste your App Registration's Application (client) ID into backend/appsettings.Development.json.");
}

var connectionString = config.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not set. Paste your SQL Server connection string into backend/appsettings.Development.json.");
}

// ---------- Database ----------
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(maxRetryCount: 3)));

// ---------- Authentication: Microsoft Entra ID (work/school + personal accounts) ----------
// TenantId = "common" accepts both; set a specific tenant GUID to restrict to one org.
// Valid audiences default to both "{ClientId}" and "api://{ClientId}".
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(config.GetSection("AzureAd"));

// ---------- Authorization: allowlist + admin ----------
builder.Services.AddScoped<IUserAccessService, UserAccessService>();
builder.Services.AddScoped<IAuthorizationHandler, AllowedUserHandler>();
builder.Services.AddScoped<IAuthorizationHandler, AdminHandler>();
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationMiddlewareResultHandler, JsonAuthorizationResultHandler>();

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.AllowedUser, p => p
        .RequireAuthenticatedUser()
        .AddRequirements(new AllowedUserRequirement()))
    .AddPolicy(Policies.Admin, p => p
        .RequireAuthenticatedUser()
        .AddRequirements(new AdminRequirement()))
    // Every endpoint without an explicit [AllowAnonymous] requires an allowlisted user.
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .AddRequirements(new AllowedUserRequirement())
        .Build());

// ---------- CORS ----------
const string SpaCorsPolicy = "Spa";
var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddPolicy(SpaCorsPolicy, p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddControllers();
builder.Services.AddProblemDetails();

var app = builder.Build();

// ---------- Apply EF Core migrations automatically (Development by default) ----------
if (config.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    logger.LogInformation("Applying EF Core migrations...");
    db.Database.Migrate();
    logger.LogInformation("Database is up to date.");
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors(SpaCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }))
   .AllowAnonymous();

app.MapControllers();

app.Run();

public partial class Program;
