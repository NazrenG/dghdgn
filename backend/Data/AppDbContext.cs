using AllowlistApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AllowlistApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AllowedUser> AllowedUsers => Set<AllowedUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AllowedUser>(e =>
        {
            e.ToTable("AllowedUsers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).IsRequired().HasMaxLength(320);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).IsRequired().HasMaxLength(20).HasDefaultValue(Roles.User);
            e.Property(x => x.IsActive).IsRequired().HasDefaultValue(true);
            e.Property(x => x.CreatedAtUtc).IsRequired().HasDefaultValueSql("SYSUTCDATETIME()");
            e.Property(x => x.CreatedBy).HasMaxLength(320);
        });
    }
}
