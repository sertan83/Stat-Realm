const controlClassName =
  "h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white outline-none backdrop-blur-md transition focus:border-white/25";

type ExploreFiltersProps = {
  query: string;
  genre: string;
  platform: string;
  sortBy: string;
  hideDlc: boolean;
  onQueryChange: (query: string) => void;
  onGenreChange: (genre: string) => void;
  onPlatformChange: (platform: string) => void;
  onSortByChange: (sortBy: string) => void;
  onHideDlcChange: (hideDlc: boolean) => void;
};

export function ExploreFilters({
  query,
  genre,
  platform,
  sortBy,
  hideDlc,
  onQueryChange,
  onGenreChange,
  onPlatformChange,
  onSortByChange,
  onHideDlcChange,
}: ExploreFiltersProps) {
  return (
    <div className="mt-8 space-y-4">
      <label className="block">
        <span className="sr-only">Search games</span>
        <input
          type="search"
          name="search"
          placeholder="Search games..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className={`${controlClassName} w-full placeholder:text-white/35`}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <label>
          <span className="sr-only">Genre</span>
          <select
            name="genre"
            value={genre}
            onChange={(event) => onGenreChange(event.target.value)}
            className={`${controlClassName} w-full`}
          >
            <option value="">Genre</option>
            <option>Action</option>
            <option>Adventure</option>
            <option>RPG</option>
            <option>Strategy</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Platform</span>
          <select
            name="platform"
            value={platform}
            onChange={(event) => onPlatformChange(event.target.value)}
            className={`${controlClassName} w-full`}
          >
            <option value="">Platform</option>
            <option>Windows</option>
            <option>macOS</option>
            <option>Linux</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Sort games</span>
          <select
            name="sort"
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value)}
            className={`${controlClassName} w-full`}
          >
            <option value="">Sort By</option>
            <option>Most Popular</option>
            <option>Newest</option>
            <option>Name</option>
          </select>
        </label>

        <label className="flex h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white backdrop-blur-md sm:col-span-2 lg:col-span-1">
          <span>Hide DLC</span>
          <input
            type="checkbox"
            name="hideDlc"
            checked={hideDlc}
            onChange={(event) => onHideDlcChange(event.target.checked)}
            className="peer sr-only"
          />
          <span className="relative h-5 w-9 rounded-full bg-white/15 transition peer-checked:bg-[#E2363C] peer-checked:[&>span]:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
            <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform" />
          </span>
        </label>
      </div>
    </div>
  );
}
