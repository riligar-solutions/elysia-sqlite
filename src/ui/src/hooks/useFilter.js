import { useState, useMemo } from "react";

export function useFilter(items, filterKeys = []) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [logicalOperators, setLogicalOperators] = useState({}); // Stores AND/OR between filters

  // Helper function to apply operator
  const applyOperator = (elementValue, operator, filterValue) => {
    const elemStr = String(elementValue).toLowerCase();
    const filterStr = String(filterValue).toLowerCase();
    const elemNum = Number(elementValue);
    const filterNum = Number(filterValue);

    switch (operator) {
      case "=":
        return elemStr === filterStr;
      case "!=":
        return elemStr !== filterStr;
      case "contains":
        return elemStr.includes(filterStr);
      case "not_contains":
        return !elemStr.includes(filterStr);
      case ">":
        return !isNaN(elemNum) && !isNaN(filterNum) && elemNum > filterNum;
      case "<":
        return !isNaN(elemNum) && !isNaN(filterNum) && elemNum < filterNum;
      case ">=":
        return !isNaN(elemNum) && !isNaN(filterNum) && elemNum >= filterNum;
      case "<=":
        return !isNaN(elemNum) && !isNaN(filterNum) && elemNum <= filterNum;
      default:
        return elemStr.includes(filterStr);
    }
  };

  // Filter elements based on active filters + query + logical operators
  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter((element) => {
      // Free text filter (query)
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        // If filterKeys are provided, search only in those keys, otherwise search in all values
        const searchKeys =
          filterKeys.length > 0 ? filterKeys : Object.keys(element);

        const matchesSearch = searchKeys.some((key) => {
          const val = element[key];
          return val && String(val).toLowerCase().includes(searchTerm);
        });

        if (!matchesSearch) return false;
      }

      // Key:operator:value filters (active chips)
      const activeFilterKeys = Object.keys(activeFilters);
      if (activeFilterKeys.length === 0) return true;

      // Evaluate each filter
      const filterResults = {};
      for (const key of activeFilterKeys) {
        const valueStr = activeFilters[key];
        const values = valueStr.split(",").map((v) => v.trim());
        let matches = false;

        for (const value of values) {
          let operator = "=";
          let filterValue = value;

          const opMatch = value.match(
            /^([=!><]+|contains|not_contains)\s*(.*)$/
          );
          if (opMatch) {
            operator = opMatch[1];
            filterValue = opMatch[2];
          }

          const elementValue = element[key];
          if (
            elementValue !== undefined &&
            applyOperator(elementValue, operator, filterValue)
          ) {
            matches = true;
            break;
          }
        }
        filterResults[key] = matches;
      }

      // Apply logical operators between filters
      let result = filterResults[activeFilterKeys[0]];
      for (let i = 1; i < activeFilterKeys.length; i++) {
        const logicalOp = logicalOperators[activeFilterKeys[i - 1]] || "AND";
        if (logicalOp === "OR") {
          result = result || filterResults[activeFilterKeys[i]];
        } else {
          result = result && filterResults[activeFilterKeys[i]];
        }
      }

      return result;
    });
  }, [items, query, activeFilters, logicalOperators, filterKeys]);

  return {
    filteredItems,
    data: {
      query,
      activeFilters,
      logicalOperators,
    },
    setData: {
      setQuery,
      setActiveFilters,
      setLogicalOperators,
    },
  };
}
